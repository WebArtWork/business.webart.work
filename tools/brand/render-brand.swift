// Draws the Business brand kit with CoreGraphics: the logo mark (three rising bars), web and app icons,
// splash screens, the landing illustration and the social cards. No image tools are needed.
// Run from the project root: swift tools/brand/render-brand.swift
import AppKit

// MARK: palette

func rgb(_ hex: UInt32, _ alpha: CGFloat = 1) -> NSColor {
	NSColor(
		srgbRed: CGFloat((hex >> 16) & 0xff) / 255, green: CGFloat((hex >> 8) & 0xff) / 255,
		blue: CGFloat(hex & 0xff) / 255, alpha: alpha)
}

let navy = rgb(0x0F1724)
let card = rgb(0x172235)
let cardEdge = rgb(0x24324B)
let amberTop = rgb(0xF7C35C)
let amberBottom = rgb(0xE8892B)
let teal = rgb(0x3CCFB4)
let slate = rgb(0x5B6B85)
let ink = rgb(0xF3F5F8)
let mute = rgb(0x93A0B5)

// MARK: canvas

/// Draws into a bitmap whose origin is the top-left corner, then saves it as PNG or JPEG.
func render(_ path: String, _ width: Int, _ height: Int, opaque: Bool = false, _ draw: (CGContext, CGRect) -> Void) {
	let space = CGColorSpace(name: CGColorSpace.sRGB)!
	let info = opaque ? CGImageAlphaInfo.noneSkipLast.rawValue : CGImageAlphaInfo.premultipliedLast.rawValue
	let ctx = CGContext(
		data: nil, width: width, height: height, bitsPerComponent: 8, bytesPerRow: 0, space: space,
		bitmapInfo: info)!
	ctx.translateBy(x: 0, y: CGFloat(height))
	ctx.scaleBy(x: 1, y: -1)
	NSGraphicsContext.saveGraphicsState()
	NSGraphicsContext.current = NSGraphicsContext(cgContext: ctx, flipped: true)
	draw(ctx, CGRect(x: 0, y: 0, width: width, height: height))
	NSGraphicsContext.restoreGraphicsState()
	let rep = NSBitmapImageRep(cgImage: ctx.makeImage()!)
	let jpeg = path.hasSuffix(".jpg")
	let data = rep.representation(
		using: jpeg ? .jpeg : .png, properties: jpeg ? [.compressionFactor: 0.88] : [:])!
	try! FileManager.default.createDirectory(
		atPath: (path as NSString).deletingLastPathComponent, withIntermediateDirectories: true)
	try! data.write(to: URL(fileURLWithPath: path))
}

func fill(_ ctx: CGContext, _ rect: CGRect, _ color: NSColor, radius: CGFloat = 0) {
	ctx.setFillColor(color.cgColor)
	ctx.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil))
	ctx.fillPath()
}

func stroke(_ ctx: CGContext, _ rect: CGRect, _ color: NSColor, radius: CGFloat, width: CGFloat) {
	ctx.setStrokeColor(color.cgColor)
	ctx.setLineWidth(width)
	ctx.addPath(CGPath(roundedRect: rect.insetBy(dx: width / 2, dy: width / 2), cornerWidth: radius, cornerHeight: radius, transform: nil))
	ctx.strokePath()
}

/// A rounded rectangle filled with a vertical gradient from `top` to `bottom`.
func gradient(_ ctx: CGContext, _ rect: CGRect, _ top: NSColor, _ bottom: NSColor, radius: CGFloat) {
	ctx.saveGState()
	ctx.addPath(CGPath(roundedRect: rect, cornerWidth: radius, cornerHeight: radius, transform: nil))
	ctx.clip()
	let colors = [top.cgColor, bottom.cgColor] as CFArray
	let shade = CGGradient(colorsSpace: CGColorSpace(name: CGColorSpace.sRGB), colors: colors, locations: [0, 1])!
	ctx.drawLinearGradient(shade, start: CGPoint(x: rect.midX, y: rect.minY), end: CGPoint(x: rect.midX, y: rect.maxY), options: [])
	ctx.restoreGState()
}

func text(_ string: String, _ point: CGPoint, size: CGFloat, weight: NSFont.Weight, color: NSColor, kern: CGFloat = 0, width: CGFloat = 2000, lineHeight: CGFloat? = nil) -> CGFloat {
	let style = NSMutableParagraphStyle()
	if let lineHeight {
		style.minimumLineHeight = lineHeight
		style.maximumLineHeight = lineHeight
	}
	let attributed = NSAttributedString(
		string: string,
		attributes: [
			.font: NSFont.systemFont(ofSize: size, weight: weight), .foregroundColor: color, .kern: kern,
			.paragraphStyle: style,
		])
	let bounds = attributed.boundingRect(with: CGSize(width: width, height: 2000), options: [.usesLineFragmentOrigin])
	attributed.draw(with: CGRect(origin: point, size: CGSize(width: width, height: bounds.height)), options: [.usesLineFragmentOrigin])
	return bounds.height
}

// MARK: logo mark

/// Three rising bars with rounded tops, filling `box` (a square).
func mark(_ ctx: CGContext, _ box: CGRect) {
	let unit = box.width
	let barWidth = unit * 0.24
	let gap = unit * 0.14
	let heights: [CGFloat] = [0.42, 0.68, 1.0]
	for (index, share) in heights.enumerated() {
		let height = unit * share
		let rect = CGRect(
			x: box.minX + CGFloat(index) * (barWidth + gap), y: box.maxY - height, width: barWidth, height: height)
		gradient(ctx, rect, amberTop, amberBottom, radius: barWidth * 0.32)
	}
}

/// The mark centered in `rect`, taking `share` of its shorter side.
func centeredMark(_ ctx: CGContext, _ rect: CGRect, share: CGFloat) {
	let side = min(rect.width, rect.height) * share
	mark(ctx, CGRect(x: rect.midX - side / 2, y: rect.midY - side / 2, width: side, height: side))
}

/// A square app icon: navy, rounded or round, with the mark.
func icon(_ path: String, _ size: Int, shape: String = "square", opaque: Bool = false) {
	render(path, size, size, opaque: opaque) { ctx, rect in
		let side = rect.width
		switch shape {
		case "round": fill(ctx, rect, navy, radius: side / 2)
		case "rounded": fill(ctx, rect, navy, radius: side * 0.22)
		default: fill(ctx, rect, navy)
		}
		centeredMark(ctx, rect, share: 0.5)
	}
}

// MARK: illustration

/// A business dashboard: a growth chart, a market-share donut, a funnel and a KPI, inside `area`.
func illustration(_ ctx: CGContext, _ area: CGRect) {
	let s = area.width / 1000  // drawn on a 1000 × 600 grid
	func r(_ x: CGFloat, _ y: CGFloat, _ w: CGFloat, _ h: CGFloat) -> CGRect {
		CGRect(x: area.minX + x * s, y: area.minY + y * s, width: w * s, height: h * s)
	}
	// dotted backdrop
	ctx.setFillColor(cardEdge.withAlphaComponent(0.55).cgColor)
	for column in stride(from: 20, through: 980, by: 40) {
		for row in stride(from: 20, through: 580, by: 40) {
			ctx.fillEllipse(in: r(CGFloat(column) - 2, CGFloat(row) - 2, 4, 4))
		}
	}
	func panel(_ frame: CGRect) {
		fill(ctx, frame, card, radius: 22 * s)
		stroke(ctx, frame, cardEdge, radius: 22 * s, width: 2 * s)
	}
	func lines(_ x: CGFloat, _ y: CGFloat, _ widths: [CGFloat]) {
		for (index, width) in widths.enumerated() {
			fill(ctx, r(x, y + CGFloat(index) * 22, width, 10), index == 0 ? mute.withAlphaComponent(0.8) : slate.withAlphaComponent(0.7), radius: 5 * s)
		}
	}

	// growth chart
	panel(r(150, 40, 560, 360))
	lines(185, 72, [170, 110])
	let bars: [CGFloat] = [70, 100, 92, 140, 175, 220]
	for (index, height) in bars.enumerated() {
		let frame = r(195 + CGFloat(index) * 82, 370 - height, 52, height)
		if index == bars.count - 1 {
			gradient(ctx, frame, amberTop, amberBottom, radius: 12 * s)
		} else {
			gradient(ctx, frame, slate.withAlphaComponent(0.95), slate.withAlphaComponent(0.55), radius: 12 * s)
		}
	}
	let points = bars.enumerated().map { index, height in
		CGPoint(x: area.minX + (221 + CGFloat(index) * 82) * s, y: area.minY + (340 - height) * s)
	}
	ctx.setStrokeColor(teal.cgColor)
	ctx.setLineWidth(5 * s)
	ctx.setLineCap(.round)
	ctx.setLineJoin(.round)
	ctx.addLines(between: points)
	ctx.strokePath()
	ctx.setFillColor(teal.cgColor)
	for point in points {
		ctx.fillEllipse(in: CGRect(x: point.x - 9 * s, y: point.y - 9 * s, width: 18 * s, height: 18 * s))
		ctx.setFillColor(card.cgColor)
		ctx.fillEllipse(in: CGRect(x: point.x - 4 * s, y: point.y - 4 * s, width: 8 * s, height: 8 * s))
		ctx.setFillColor(teal.cgColor)
	}

	// market share donut
	panel(r(40, 300, 300, 260))
	let center = CGPoint(x: area.minX + 125 * s, y: area.minY + 430 * s)
	let radius = 62 * s
	let shares: [(CGFloat, NSColor)] = [(0.58, amberBottom), (0.27, teal), (0.15, slate)]
	var start = -CGFloat.pi / 2
	ctx.setLineWidth(26 * s)
	ctx.setLineCap(.butt)
	for (share, color) in shares {
		let end = start + share * 2 * .pi
		ctx.setStrokeColor(color.cgColor)
		ctx.addArc(center: center, radius: radius, startAngle: start + 0.03, endAngle: end - 0.03, clockwise: false)
		ctx.strokePath()
		start = end
	}
	lines(215, 395, [90, 70, 80])

	// funnel
	panel(r(740, 70, 230, 270))
	let steps: [CGFloat] = [170, 132, 94, 56]
	for (index, width) in steps.enumerated() {
		let frame = r(855 - width / 2, 105 + CGFloat(index) * 54, width, 40)
		let alpha = 1 - CGFloat(index) * 0.18
		gradient(ctx, frame, amberTop.withAlphaComponent(alpha), amberBottom.withAlphaComponent(alpha), radius: 10 * s)
	}

	// KPI
	panel(r(640, 400, 300, 150))
	lines(670, 430, [120])
	_ = text("+24%", CGPoint(x: area.minX + 668 * s, y: area.minY + 458 * s), size: 54 * s, weight: .bold, color: teal)
	ctx.setFillColor(teal.cgColor)
	let arrow = CGMutablePath()
	arrow.move(to: CGPoint(x: area.minX + 880 * s, y: area.minY + 470 * s))
	arrow.addLine(to: CGPoint(x: area.minX + 905 * s, y: area.minY + 505 * s))
	arrow.addLine(to: CGPoint(x: area.minX + 855 * s, y: area.minY + 505 * s))
	arrow.closeSubpath()
	ctx.addPath(arrow)
	ctx.fillPath()
}

// MARK: social cards

func socialCard(_ path: String, eyebrow: String, title: String, tagline: String) {
	render(path, 1200, 630, opaque: true) { ctx, rect in
		fill(ctx, rect, navy)
		illustration(ctx, CGRect(x: 560, y: 90, width: 600, height: 360))
		mark(ctx, CGRect(x: 76, y: 64, width: 44, height: 44))
		_ = text("Business", CGPoint(x: 136, y: 66), size: 30, weight: .bold, color: ink)
		_ = text(eyebrow.uppercased(), CGPoint(x: 76, y: 178), size: 17, weight: .semibold, color: amberTop, kern: 2.4)
		let height = text(title, CGPoint(x: 76, y: 214), size: 58, weight: .bold, color: ink, width: 470, lineHeight: 64)
		fill(ctx, CGRect(x: 76, y: 214 + height + 28, width: 44, height: 4), amberBottom, radius: 2)
		_ = text(tagline, CGPoint(x: 76, y: 214 + height + 52), size: 22, weight: .regular, color: mute, width: 470)
		_ = text("business.webart.work", CGPoint(x: 76, y: 548), size: 21, weight: .medium, color: mute)
		_ = text("89 THEORIES · EN / UA", CGPoint(x: 900, y: 552), size: 15, weight: .semibold, color: mute, kern: 1.6)
	}
}

// MARK: output

let assets = "src/assets"
render("\(assets)/logo.png", 512, 512) { ctx, rect in
	fill(ctx, rect, navy)
	centeredMark(ctx, rect, share: 0.56)
}
icon("\(assets)/favicon.png", 64, shape: "rounded")
icon("\(assets)/apple-touch-icon.png", 180, opaque: true)
for size in [48, 72, 96, 128, 192, 256, 512] { icon("\(assets)/icons/icon-\(size).png", size) }

render("\(assets)/hero.jpg", 1200, 630, opaque: true) { ctx, rect in
	fill(ctx, rect, navy)
	illustration(ctx, CGRect(x: 110, y: 18, width: 980, height: 588))
}

let cards: [(String, String, String, String)] = [
	("dashboard", "Business", "Learn to build and manage companies", "Theories and practice, in English and Ukrainian."),
	("theory", "Theories", "89 business theories", "Short and detailed versions of every framework."),
	("practice", "Practice", "Prove what you know", "Questions and cases for every theory."),
	("privacy", "Policy", "Privacy", "What we keep, and what we never collect."),
	("profile", "Profile", "Your progress", "Rating, rank and the theories you understand."),
	("sign-in", "Account", "Sign in", "Keep your progress on every device."),
	("licenses", "Legal", "Licenses and credits", "Free software under GPL-3.0-or-later."),
]
for (file, eyebrow, title, tagline) in cards {
	socialCard("\(assets)/seo/\(file).jpg", eyebrow: eyebrow, title: title, tagline: tagline)
}

// Android: legacy, round and adaptive launcher icons, and splash screens
let densities: [(String, Int)] = [("ldpi", 36), ("mdpi", 48), ("hdpi", 72), ("xhdpi", 96), ("xxhdpi", 144), ("xxxhdpi", 192)]
let res = "android/app/src/main/res"
for (density, size) in densities {
	icon("\(res)/mipmap-\(density)/ic_launcher.png", size, shape: "rounded")
	icon("\(res)/mipmap-\(density)/ic_launcher_round.png", size, shape: "round")
	let layer = Int((Double(size) * 2.25).rounded())
	render("\(res)/mipmap-\(density)/ic_launcher_background.png", layer, layer, opaque: true) { ctx, rect in fill(ctx, rect, navy) }
	render("\(res)/mipmap-\(density)/ic_launcher_foreground.png", layer, layer) { ctx, rect in centeredMark(ctx, rect, share: 0.62) }
}
let splashes = try! FileManager.default.subpathsOfDirectory(atPath: res).filter { $0.hasSuffix("splash.png") }
for splash in splashes {
	let image = NSImage(contentsOfFile: "\(res)/\(splash)")!.representations[0]
	render("\(res)/\(splash)", image.pixelsWide, image.pixelsHigh, opaque: true) { ctx, rect in
		fill(ctx, rect, navy)
		centeredMark(ctx, rect, share: 0.26)
	}
}

// iOS: the app icon has no alpha channel; the splash images are 2732 × 2732
let xcassets = "ios/App/App/Assets.xcassets"
icon("\(xcassets)/AppIcon.appiconset/AppIcon-512@2x.png", 1024, opaque: true)
for splash in try! FileManager.default.contentsOfDirectory(atPath: "\(xcassets)/Splash.imageset") where splash.hasSuffix(".png") {
	render("\(xcassets)/Splash.imageset/\(splash)", 2732, 2732, opaque: true) { ctx, rect in
		fill(ctx, rect, navy)
		centeredMark(ctx, rect, share: 0.2)
	}
}
print("Brand kit rendered.")
