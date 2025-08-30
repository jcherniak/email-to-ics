import Foundation

#if targetEnvironment(simulator)
#if canImport(UIKit)
import UIKit
typealias PlatformImage = UIImage
#elseif canImport(AppKit)
import AppKit
typealias PlatformImage = NSImage
#endif

struct LoadedPage {
    let html: String
    let jpegBase64: String?
}

final class WebLoader: NSObject {
    func load(url: URL) async throws -> LoadedPage {
        Log.web.info("Simulator WebLoader: fetching via URLSession (no WebKit)")
        let (data, _) = try await URLSession.shared.data(from: url)
        let htmlStr = String(data: data, encoding: .utf8) ?? ""
        return LoadedPage(html: htmlStr, jpegBase64: nil)
    }
}

#else
import WebKit
#if canImport(UIKit)
import UIKit
typealias PlatformImage = UIImage
#elseif canImport(AppKit)
import AppKit
typealias PlatformImage = NSImage
#endif

struct LoadedPage {
    let html: String
    let jpegBase64: String?
}

final class WebLoader: NSObject, WKNavigationDelegate {
    private var webView: WKWebView!
    private var continuation: CheckedContinuation<LoadedPage, Error>?

    func load(url: URL) async throws -> LoadedPage {
        Log.web.info("WebLoader: loading URL=\(url.absoluteString, privacy: .public)")
        let config = WKWebViewConfiguration()
        webView = WKWebView(frame: .zero, configuration: config)
        webView.navigationDelegate = self
        let req = URLRequest(url: url)

        return try await withCheckedThrowingContinuation { (cont: CheckedContinuation<LoadedPage, Error>) in
            self.continuation = cont
            webView.load(req)
        }
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Small delay to let dynamic content settle
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.6) {
            Log.web.info("WebLoader: navigation finished; capturing HTML/PDF")
            self.capture()
        }
    }

    private func capture() {
        webView.evaluateJavaScript("document.documentElement.outerHTML") { [weak self] html, err in
            guard let self else { return }
            if let err { Log.web.error("WebLoader: JS error extracting HTML: \(err.localizedDescription)") }
            let htmlStr = (html as? String) ?? ""
            Log.web.debug("WebLoader: HTML length=\(htmlStr.count)")

            if #available(iOS 15.0, macOS 12.0, *) {
                let pdfConfig = WKPDFConfiguration()
                webView.createPDF(configuration: pdfConfig) { result in
                    switch result {
                    case .success(let data):
                        Log.web.info("WebLoader: PDF captured (\(data.count) bytes); attempting sub-500KB JPEG")
                        let target = 500 * 1024
                        let widths: [CGFloat] = [1024, 800, 640, 512, 384, 320]
                        let qualities: [CGFloat] = [0.65, 0.55, 0.45, 0.35, 0.25]
                        outer: for w in widths {
                            guard let image = Self.rasterizeFirstPage(pdfData: data, maxWidth: w) else { continue }
                            #if canImport(UIKit)
                            for q in qualities {
                                if let jpeg = image.jpegData(compressionQuality: q), jpeg.count <= target {
                                    let b64 = jpeg.base64EncodedString()
                                    Log.web.info("WebLoader: JPEG ok width=\(Int(w)) q=\(q) size=\(jpeg.count) bytes; b64 len=\(b64.count)")
                                    self.continuation?.resume(returning: LoadedPage(html: htmlStr, jpegBase64: b64))
                                    self.continuation = nil
                                    break outer
                                }
                            }
                            #elseif canImport(AppKit)
                            if let tiff = image.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff) {
                                for q in qualities {
                                    if let jpeg = rep.representation(using: .jpeg, properties: [.compressionFactor: q]), jpeg.count <= target {
                                        let b64 = jpeg.base64EncodedString()
                                        Log.web.info("WebLoader: JPEG ok width=\(Int(w)) q=\(q) size=\(jpeg.count) bytes; b64 len=\(b64.count)")
                                        self.continuation?.resume(returning: LoadedPage(html: htmlStr, jpegBase64: b64))
                                        self.continuation = nil
                                        break outer
                                    }
                                }
                            }
                            #endif
                        }
                        if let cont = self.continuation {
                            Log.web.info("WebLoader: could not reach sub-500KB; proceeding without image")
                            cont.resume(returning: LoadedPage(html: htmlStr, jpegBase64: nil))
                            self.continuation = nil
                        }
                    case .failure(let error):
                        Log.web.error("WebLoader: PDF generation failed: \(error.localizedDescription)")
                        self.continuation?.resume(returning: LoadedPage(html: htmlStr, jpegBase64: nil))
                        self.continuation = nil
                    }
                }
            } else {
                Log.web.info("WebLoader: PDF API unavailable; returning HTML only")
                self.continuation?.resume(returning: LoadedPage(html: htmlStr, jpegBase64: nil))
                self.continuation = nil
            }
        }
    }

    private static func rasterizeFirstPage(pdfData: Data, maxWidth: CGFloat) -> PlatformImage? {
        guard let provider = CGDataProvider(data: pdfData as CFData), let doc = CGPDFDocument(provider) else { return nil }
        guard let page = doc.page(at: 1) else { return nil }
        func validRect(_ r: CGRect) -> CGRect? {
            guard r.width.isFinite, r.height.isFinite, r.width > 0, r.height > 0 else { return nil }
            return r
        }
        let base = validRect(page.getBoxRect(.mediaBox))
            ?? validRect(page.getBoxRect(.cropBox))
            ?? validRect(page.getBoxRect(.bleedBox))
            ?? validRect(page.getBoxRect(.trimBox))
            ?? validRect(page.getBoxRect(.artBox))
            ?? CGRect(x: 0, y: 0, width: 612, height: 792) // fallback

        var rect = base
        var scale = maxWidth / max(rect.width, CGFloat(1))
        if !scale.isFinite || scale <= 0 { scale = 1 }
        let outW = max(CGFloat(1), floor(rect.width * scale))
        let outH = max(CGFloat(1), floor(rect.height * scale))
        rect.size = CGSize(width: outW, height: outH)

        #if canImport(UIKit)
        UIGraphicsBeginImageContextWithOptions(rect.size, true, 1.0)
        guard let ctx = UIGraphicsGetCurrentContext() else { return nil }
        ctx.setFillColor(UIColor.white.cgColor)
        ctx.fill(rect)
        ctx.saveGState()
        ctx.translateBy(x: 0, y: rect.size.height)
        ctx.scaleBy(x: scale, y: -scale)
        ctx.drawPDFPage(page)
        ctx.restoreGState()
        let img = UIGraphicsGetImageFromCurrentImageContext()
        UIGraphicsEndImageContext()
        return img
        #else
        let colorSpace = CGColorSpaceCreateDeviceRGB()
        let widthPx = max(1, Int(rect.width))
        let heightPx = max(1, Int(rect.height))
        guard let bitmap = CGContext(data: nil,
                                     width: widthPx,
                                     height: heightPx,
                                     bitsPerComponent: 8,
                                     bytesPerRow: 0,
                                     space: colorSpace,
                                     bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue) else { return nil }
        bitmap.setFillColor(NSColor.white.cgColor)
        bitmap.fill(CGRect(origin: .zero, size: rect.size))
        bitmap.saveGState()
        bitmap.translateBy(x: 0, y: rect.size.height)
        bitmap.scaleBy(x: scale, y: -scale)
        bitmap.drawPDFPage(page)
        bitmap.restoreGState()
        guard let cg = bitmap.makeImage() else { return nil }
        let img = NSImage(cgImage: cg, size: rect.size)
        return img
        #endif
    }
}
#endif
