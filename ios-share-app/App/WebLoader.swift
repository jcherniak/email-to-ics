import Foundation
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
            self.capture()
        }
    }

    private func capture() {
        webView.evaluateJavaScript("document.documentElement.outerHTML") { [weak self] html, _ in
            guard let self else { return }
            let htmlStr = (html as? String) ?? ""

            if #available(iOS 15.0, macOS 12.0, *) {
                let pdfConfig = WKPDFConfiguration()
                webView.createPDF(configuration: pdfConfig) { data, error in
                    // Only use PDF if total size <= 500 KB; otherwise skip image signal.
                    if let data, error == nil, data.count <= 500 * 1024,
                       let image = Self.rasterizeFirstPage(pdfData: data, maxWidth: 1024),
                       let jpeg = image.jpegData(compressionQuality: 0.75) {
                        let b64 = jpeg.base64EncodedString()
                        self.continuation?.resume(returning: LoadedPage(html: htmlStr, jpegBase64: b64))
                        self.continuation = nil
                    } else {
                        self.continuation?.resume(returning: LoadedPage(html: htmlStr, jpegBase64: nil))
                        self.continuation = nil
                    }
                }
            } else {
                self.continuation?.resume(returning: LoadedPage(html: htmlStr, jpegBase64: nil))
                self.continuation = nil
            }
        }
    }

    private static func rasterizeFirstPage(pdfData: Data, maxWidth: CGFloat) -> PlatformImage? {
        guard let doc = CGPDFDocument(CGDataProvider(data: pdfData as CFData)!) else { return nil }
        guard let page = doc.page(at: 1) else { return nil }
        var rect = page.getBoxRect(.mediaBox)
        let scale = maxWidth / rect.width
        rect.size = CGSize(width: rect.width * scale, height: rect.height * scale)

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
        guard let bitmap = CGContext(data: nil,
                                     width: Int(rect.width),
                                     height: Int(rect.height),
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
