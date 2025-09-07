"use client";

import type React from "react";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Download, FileText, Globe, File, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  type ExportOptions,
  type StoryExportData,
  generateHTMLExport,
  generateTextExport,
  downloadFile,
  sanitizeFilename,
} from "@/lib/export-utils";

interface ExportDialogProps {
  storyData: StoryExportData;
  trigger?: React.ReactNode;
}

export function ExportDialog({ storyData, trigger }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "html_download",
    includeImages: true,
    pageSize: "a4",
    fontSize: "medium",
  });

  const { toast } = useToast();

  const openAndPrint = (html: string) => {
    const w = window.open("", "_blank");
    if (!w) {
      toast({
        title: "Unable to open window",
        description: "Popup blocked. Please allow popups for this site.",
        variant: "destructive",
      });
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Wait a bit for resources to load, then trigger print
    setTimeout(() => {
      try {
        w.focus();
        w.print();
      } catch (e) {
        console.warn("Print failed", e);
      }
    }, 700);
  };

  const handleExport = async () => {
    setIsExporting(true);

    try {
      const filename = sanitizeFilename(
        storyData.metadata.title || "storybook"
      );

      switch (exportOptions.format) {
        case "html_download": {
          const htmlContent = generateHTMLExport(storyData, exportOptions);
          downloadFile(htmlContent, `${filename}.html`, "text/html");
          break;
        }

        case "html_print_pdf": {
          // Generate full HTML and open print dialog (user should choose "Save as PDF")
          const htmlContent = generateHTMLExport(storyData, exportOptions);
          openAndPrint(htmlContent);
          toast({
            title: "Print to PDF",
            description:
              "A print dialog was opened. Choose 'Save as PDF' in your printer options.",
          });
          break;
        }

        case "images_print_pdf": {
          const imagesOnly = storyData.content.filter(
            (p) => !!p.imageUrl || !!p.imagePrompt
          );
          const fontSize =
            exportOptions.fontSize === "small"
              ? "14px"
              : exportOptions.fontSize === "large"
              ? "20px"
              : "16px";
        
          const imagesHtml = `<!doctype html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width,initial-scale=1">
            <title>${storyData.metadata.title} - Images</title>
            <style>
              body {
                font-family: Arial, Helvetica, sans-serif;
                margin: 0;
                padding: 0;
                font-size: ${fontSize};
                color: #222;
              }
              .image-wrap {
                margin: 0;
                padding: 0;
                text-align: center;
                page-break-after: always; /* ensure next image starts on new page */
              }
              img {
                width: 100%;
                height: 100%;
                object-fit: contain; /* keep aspect ratio */
                display: block;
              }
              h3 {
                display: none;
              }
              @page {
                size: A4 portrait; /* adjust as needed */
                margin: 0;
              }
              html, body {
                height: 100%;
              }
            </style>
          </head>
          <body>
            ${imagesOnly
              .map(
                (p) => `
                <div class="image-wrap">
                  <h3>Page ${p.pageNumber} - ${p.title || ""}</h3>
                  ${
                    p.imageUrl
                      ? `<img src="${p.imageUrl}" alt="${p.imagePrompt || "image"}" />`
                      : `<div style="padding:40px;border:2px dashed #ccc;border-radius:6px;color:#666;font-style:italic;display:inline-block">Image: ${p.imagePrompt}</div>`
                  }
                </div>`
              )
              .join("")}
          </body>
          </html>`;
        
          openAndPrint(imagesHtml);
          toast({
            title: "Print Images to PDF",
            description:
              "A print dialog was opened for images. Choose 'Save as PDF'.",
          });
          break;
        }

        case "images_zip": {
          // Download all images as a ZIP file
          const JSZip = (await import("jszip")).default;
          const zip = new JSZip();
          storyData.content.forEach((p, idx) => {
            if (p.imageUrl && p.imageUrl.startsWith("data:")) {
              const matches = p.imageUrl.match(/^data:(.+);base64,(.*)$/);
              if (matches) {
                const mimeType = matches[1];
                const base64 = matches[2];
                const ext = mimeType.split("/")[1] || "png";
                zip.file(`page_${p.pageNumber || idx + 1}.${ext}`, base64, { base64: true });
              }
            }
          });
          if (storyData.cover?.imageUrl && storyData.cover.imageUrl.startsWith("data:")) {
            const matches = storyData.cover.imageUrl.match(/^data:(.+);base64,(.*)$/);
            if (matches) {
              const mimeType = matches[1];
              const base64 = matches[2];
              const ext = mimeType.split("/")[1] || "png";
              zip.file(`cover.${ext}`, base64, { base64: true });
            }
          }
          const blob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${filename}_images.zip`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 1000);
          toast({ title: "Images ZIP Downloaded", description: "All images have been downloaded as a ZIP file." });
          break;
        }
        
        
        case "json": {
          const jsonContent = JSON.stringify(storyData, null, 2);
          downloadFile(jsonContent, `${filename}.json`, "application/json");
          break;
        }

        default:
          throw new Error("Unknown export format");
      }

      toast({
        title: "Export Requested",
        description:
          exportOptions.format === "json"
            ? "JSON downloaded."
            : "Please follow the opened window to print/save as needed.",
      });

      setIsOpen(false);
    } catch (error) {
      toast({
        title: "Export Failed",
        description:
          "There was an error exporting your storybook. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const formatIcons: Record<ExportOptions["format"], any> = {
    html_download: Globe,
    html_print_pdf: FileText,
    images_print_pdf: FileText,
    images_zip: Download,
    json: File,
  };

  const FormatIcon = formatIcons[exportOptions.format];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="gap-2">
            <Download className="h-4 w-4" />
            Export Storybook
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Export Storybook</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Format Selection */}
          <div>
            <Label className="text-base font-medium">Export Format</Label>
            <RadioGroup
              value={exportOptions.format}
              onValueChange={(value) =>
                setExportOptions((prev) => ({ ...prev, format: value as any }))
              }
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html_download" id="html_download" />
                <Label
                  htmlFor="html_download"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Globe className="h-4 w-4" />
                  HTML (Download)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html_print_pdf" id="html_print_pdf" />
                <Label
                  htmlFor="html_print_pdf"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  HTML (Open Print → PDF)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem
                  value="images_print_pdf"
                  id="images_print_pdf"
                />
                <Label
                  htmlFor="images_print_pdf"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  Images Only (Open Print → PDF)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="images_zip" id="images_zip" />
                <Label
                  htmlFor="images_zip"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  All Images (ZIP Download)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label
                  htmlFor="json"
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <File className="h-4 w-4" />
                  JSON Data
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Options */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeImages"
                checked={exportOptions.includeImages}
                onCheckedChange={(checked) =>
                  setExportOptions((prev) => ({
                    ...prev,
                    includeImages: !!checked,
                  }))
                }
                disabled={exportOptions.format === "images_print_pdf"}
              />
              <Label htmlFor="includeImages" className="cursor-pointer">
                Include images in HTML (ignored for Images Only export)
              </Label>
            </div>

            {(exportOptions.format === "html_download" ||
              exportOptions.format === "html_print_pdf") && (
              <div>
                <Label className="text-sm font-medium">Font Size</Label>
                <RadioGroup
                  value={exportOptions.fontSize}
                  onValueChange={(value) =>
                    setExportOptions((prev) => ({
                      ...prev,
                      fontSize: value as any,
                    }))
                  }
                  className="mt-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="small" id="small" />
                    <Label htmlFor="small" className="cursor-pointer text-sm">
                      Small
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="medium" id="medium" />
                    <Label htmlFor="medium" className="cursor-pointer text-sm">
                      Medium
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="large" id="large" />
                    <Label htmlFor="large" className="cursor-pointer text-sm">
                      Large
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Preview Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FormatIcon className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-sm">Export Preview</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <div>Format: {exportOptions.format.replace(/_/g, " ")}</div>
                <div>Pages: {storyData.stats.totalPages}</div>
                <div>Words: {storyData.stats.totalWords}</div>
                <div>
                  Images:{" "}
                  {exportOptions.includeImages ? "Included" : "Excluded"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full gap-2"
          >
            {isExporting ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
