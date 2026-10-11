import Foundation
import CoreGraphics
import CoreText
import ImageIO
import UniformTypeIdentifiers

// MARK: - CLI Argument Parser

struct Options {
    var fontPath: String = ""
    var text: String = "Aa"
    var outputPath: String = ""
    var mode: String = "preview" // "preview" or "thumbnail"
    var size: CGFloat = 256
    var fontSize: CGFloat = 64
    var colorHex: String = "#000000"
}

func parseArguments() -> Options {
    var opts = Options()
    for arg in CommandLine.arguments.dropFirst() {
        if arg.hasPrefix("--font=") {
            opts.fontPath = String(arg.dropFirst("--font=".count))
        } else if arg.hasPrefix("--text=") {
            opts.text = String(arg.dropFirst("--text=".count))
        } else if arg.hasPrefix("--out=") {
            opts.outputPath = String(arg.dropFirst("--out=".count))
        } else if arg.hasPrefix("--mode=") {
            opts.mode = String(arg.dropFirst("--mode=".count))
        } else if arg.hasPrefix("--size=") {
            if let val = Double(arg.dropFirst("--size=".count)) { opts.size = CGFloat(val) }
        } else if arg.hasPrefix("--font-size=") {
            if let val = Double(arg.dropFirst("--font-size=".count)) { opts.fontSize = CGFloat(val) }
        } else if arg.hasPrefix("--color=") {
            opts.colorHex = String(arg.dropFirst("--color=".count))
        }
    }
    return opts
}

// MARK: - Helpers

func parseHexColor(_ hex: String) -> CGColor {
    var clean = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    if clean.hasPrefix("#") { clean.removeFirst() }
    guard clean.count == 6, let intVal = UInt64(clean, radix: 16) else {
        return CGColor(gray: 0, alpha: 1)
    }
    let r = CGFloat((intVal >> 16) & 0xFF) / 255.0
    let g = CGFloat((intVal >> 8) & 0xFF) / 255.0
    let b = CGFloat(intVal & 0xFF) / 255.0
    return CGColor(red: r, green: g, blue: b, alpha: 1.0)
}

func loadCTFont(from path: String, size: CGFloat) -> CTFont? {
    let url = URL(fileURLWithPath: path) as CFURL
    CTFontManagerRegisterFontsForURL(url, .process, nil)
    if let descriptors = CTFontManagerCreateFontDescriptorsFromURL(url) as? [CTFontDescriptor],
       let first = descriptors.first {
        let ctFont = CTFontCreateWithFontDescriptor(first, size, nil)
        return ctFont
    }
    guard let provider = CGDataProvider(url: url),
          let cgFont = CGFont(provider) else {
        return nil
    }
    return CTFontCreateWithGraphicsFont(cgFont, size, nil, nil)
}

func isTextFullySupported(font: CTFont, text: String) -> Bool {
    var unichars = Array(text.utf16)
    var glyphs = [CGGlyph](repeating: 0, count: unichars.count)
    return CTFontGetGlyphsForCharacters(font, &unichars, &glyphs, unichars.count)
}

func selectAdaptiveText(font: CTFont, raw: String) -> String {
    let titleCase = raw.split(separator: " ")
        .map { $0.prefix(1).uppercased() + $0.dropFirst() }
        .joined(separator: " ")
    if isTextFullySupported(font: font, text: titleCase) {
        return titleCase
    }
    let upper = raw.uppercased()
    if isTextFullySupported(font: font, text: upper) {
        return upper
    }
    let lower = raw.lowercased()
    if isTextFullySupported(font: font, text: lower) {
        return lower
    }
    return titleCase
}

func selectThumbnailText(font: CTFont, customText: String) -> String {
    if !customText.isEmpty && customText != "Aa" && isTextFullySupported(font: font, text: customText) {
        return customText
    }
    if isTextFullySupported(font: font, text: "Aa") { return "Aa" }
    if isTextFullySupported(font: font, text: "AA") { return "AA" }
    if isTextFullySupported(font: font, text: "aa") { return "aa" }
    let prefix2 = String(customText.prefix(2))
    if !prefix2.isEmpty && isTextFullySupported(font: font, text: prefix2) { return prefix2 }
    let prefix1 = String(customText.prefix(1))
    if !prefix1.isEmpty && isTextFullySupported(font: font, text: prefix1) { return prefix1 }
    return "Aa"
}

// MARK: - Rendering

func renderThumbnail(font: CTFont, text: String, size: CGFloat, color: CGColor, outputPath: String) -> Bool {
    let effectiveText = selectThumbnailText(font: font, customText: text)
    let attrString = NSAttributedString(string: effectiveText, attributes: [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color
    ])
    let line = CTLineCreateWithAttributedString(attrString)
    let imageBounds = CTLineGetImageBounds(line, nil)

    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let ctx = CGContext(
            data: nil,
            width: Int(size),
            height: Int(size),
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
          ) else {
        return false
    }

    ctx.clear(CGRect(x: 0, y: 0, width: size, height: size))
    ctx.setAllowsAntialiasing(true)
    ctx.setShouldAntialias(true)
    ctx.setAllowsFontSmoothing(true)
    ctx.setShouldSmoothFonts(true)

    // Optical centering inside size x size
    let xOffset = (size - imageBounds.width) / 2.0 - imageBounds.origin.x
    let yOffset = (size - imageBounds.height) / 2.0 - imageBounds.origin.y

    ctx.textPosition = CGPoint(x: xOffset, y: yOffset)
    CTLineDraw(line, ctx)

    guard let img = ctx.makeImage() else { return false }
    let outUrl = URL(fileURLWithPath: outputPath) as CFURL
    guard let dest = CGImageDestinationCreateWithURL(outUrl, UTType.png.identifier as CFString, 1, nil) else {
        return false
    }
    CGImageDestinationAddImage(dest, img, nil)
    return CGImageDestinationFinalize(dest)
}

func renderPreview(font: CTFont, text: String, color: CGColor, outputPath: String) -> Bool {
    let paddingX: CGFloat = 16
    let paddingY: CGFloat = 8

    let attrString = NSAttributedString(string: text, attributes: [
        NSAttributedString.Key(kCTFontAttributeName as String): font,
        NSAttributedString.Key(kCTForegroundColorAttributeName as String): color
    ])
    let line = CTLineCreateWithAttributedString(attrString)
    let imageBounds = CTLineGetImageBounds(line, nil)

    let width = max(64, ceil(imageBounds.width) + paddingX * 2)
    let height = max(32, ceil(imageBounds.height) + paddingY * 2)

    guard let colorSpace = CGColorSpace(name: CGColorSpace.sRGB),
          let ctx = CGContext(
            data: nil,
            width: Int(width),
            height: Int(height),
            bitsPerComponent: 8,
            bytesPerRow: 0,
            space: colorSpace,
            bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue
          ) else {
        return false
    }

    ctx.clear(CGRect(x: 0, y: 0, width: width, height: height))
    ctx.setAllowsAntialiasing(true)
    ctx.setShouldAntialias(true)
    ctx.setAllowsFontSmoothing(true)
    ctx.setShouldSmoothFonts(true)

    let originX = paddingX - imageBounds.origin.x
    let originY = paddingY - imageBounds.origin.y

    ctx.textPosition = CGPoint(x: originX, y: originY)
    CTLineDraw(line, ctx)

    guard let img = ctx.makeImage() else { return false }
    let outUrl = URL(fileURLWithPath: outputPath) as CFURL
    guard let dest = CGImageDestinationCreateWithURL(outUrl, UTType.png.identifier as CFString, 1, nil) else {
        return false
    }
    CGImageDestinationAddImage(dest, img, nil)
    return CGImageDestinationFinalize(dest)
}

// MARK: - Main Execution

var opts = parseArguments()
guard !opts.fontPath.isEmpty, !opts.outputPath.isEmpty else {
    fputs("Usage: render-font --font=<path> --text=<text> --out=<out.png> [--mode=preview|thumbnail] [--font-size=<pt>]\n", stderr)
    exit(1)
}

if opts.fontSize == 64 && opts.mode == "thumbnail" {
    opts.fontSize = 155
}

guard let font = loadCTFont(from: opts.fontPath, size: opts.fontSize) else {
    fputs("Error: Failed to load font from \(opts.fontPath)\n", stderr)
    exit(2)
}

let color = parseHexColor(opts.colorHex)

let success: Bool
if opts.mode == "thumbnail" {
    success = renderThumbnail(font: font, text: opts.text, size: opts.size, color: color, outputPath: opts.outputPath)
} else {
    let adaptiveText = selectAdaptiveText(font: font, raw: opts.text)
    success = renderPreview(font: font, text: adaptiveText, color: color, outputPath: opts.outputPath)
}

if success {
    exit(0)
} else {
    fputs("Error: Rendering failed\n", stderr)
    exit(3)
}
