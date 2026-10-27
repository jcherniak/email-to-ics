// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "WebToICSCore",
    platforms: [.iOS("18.0"), .macOS(.v14)],
    products: [
        .library(name: "WebToICSCore", targets: ["WebToICSCore"]),
    ],
    targets: [
        .target(
            name: "WebToICSCore",
            path: "Sources/WebToICSCore",
            resources: [.copy("Resources")]
        ),
        .testTarget(
            name: "WebToICSCoreTests",
            dependencies: ["WebToICSCore"],
            path: "Tests/WebToICSCoreTests",
            resources: [.copy("Fixtures")]
        ),
    ]
)
