// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "WebToICSCore",
    platforms: [.iOS(.v18), .macOS(.v14)],
    products: [
        .library(name: "WebToICSCore", targets: ["WebToICSCore"]),
    ],
    targets: [
        .target(
            name: "WebToICSCore",
            path: "Sources/WebToICSCore"
        ),
        .testTarget(
            name: "WebToICSCoreTests",
            dependencies: ["WebToICSCore"],
            path: "Tests/WebToICSCoreTests"
        ),
    ]
)
