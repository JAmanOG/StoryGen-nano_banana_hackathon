"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Download, FileText, Globe, File, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  type ExportOptions,
  type StoryExportData,
  generateHTMLExport,
  generateTextExport,
  downloadFile,
  sanitizeFilename,
} from "@/lib/export-utils"

interface ExportDialogProps {
  storyData: StoryExportData
  trigger?: React.ReactNode
}

export function ExportDialog({ storyData, trigger }: ExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    format: "html",
    includeImages: true,
    pageSize: "a4",
    fontSize: "medium",
  })

  const { toast } = useToast()

  const handleExport = async () => {
    setIsExporting(true)

    try {
      const filename = sanitizeFilename(storyData.metadata.title || "storybook")

      switch (exportOptions.format) {
        case "html":
          const htmlContent = generateHTMLExport(storyData, exportOptions)
          downloadFile(htmlContent, `${filename}.html`, "text/html")
          break

        case "txt":
          const textContent = generateTextExport(storyData)
          downloadFile(textContent, `${filename}.txt`, "text/plain")
          break

        case "json":
          const jsonContent = JSON.stringify(storyData, null, 2)
          downloadFile(jsonContent, `${filename}.json`, "application/json")
          break

        case "pdf":
          // For now, export as HTML and suggest printing to PDF
          const pdfHtmlContent = generateHTMLExport(storyData, exportOptions)
          downloadFile(pdfHtmlContent, `${filename}_for_pdf.html`, "text/html")
          toast({
            title: "PDF Export",
            description: "HTML file downloaded. Open it in your browser and use 'Print to PDF' for best results.",
          })
          break
      }

      toast({
        title: "Export Successful",
        description: `Your storybook has been exported as ${exportOptions.format.toUpperCase()}.`,
      })

      setIsOpen(false)
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "There was an error exporting your storybook. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const formatIcons = {
    html: Globe,
    txt: FileText,
    json: File,
    pdf: FileText,
  }

  const FormatIcon = formatIcons[exportOptions.format]

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
              onValueChange={(value) => setExportOptions((prev) => ({ ...prev, format: value as any }))}
              className="mt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="html" id="html" />
                <Label htmlFor="html" className="flex items-center gap-2 cursor-pointer">
                  <Globe className="h-4 w-4" />
                  HTML (Recommended)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  PDF (via Print)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="txt" id="txt" />
                <Label htmlFor="txt" className="flex items-center gap-2 cursor-pointer">
                  <FileText className="h-4 w-4" />
                  Plain Text
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="json" id="json" />
                <Label htmlFor="json" className="flex items-center gap-2 cursor-pointer">
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
                onCheckedChange={(checked) => setExportOptions((prev) => ({ ...prev, includeImages: !!checked }))}
              />
              <Label htmlFor="includeImages" className="cursor-pointer">
                Include image descriptions
              </Label>
            </div>

            {(exportOptions.format === "html" || exportOptions.format === "pdf") && (
              <div>
                <Label className="text-sm font-medium">Font Size</Label>
                <RadioGroup
                  value={exportOptions.fontSize}
                  onValueChange={(value) => setExportOptions((prev) => ({ ...prev, fontSize: value as any }))}
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
                <div>Format: {exportOptions.format.toUpperCase()}</div>
                <div>Pages: {storyData.stats.totalPages}</div>
                <div>Words: {storyData.stats.totalWords}</div>
                <div>Images: {exportOptions.includeImages ? "Included" : "Excluded"}</div>
              </div>
            </CardContent>
          </Card>

          {/* Export Button */}
          <Button onClick={handleExport} disabled={isExporting} className="w-full gap-2">
            {isExporting ? (
              <>
                <Clock className="h-4 w-4 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Export {exportOptions.format.toUpperCase()}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
