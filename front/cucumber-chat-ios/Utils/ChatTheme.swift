import UIKit

// MARK: - ChatTheme (colors.js 1:1 대응)
enum ChatTheme {
    static let baseWidth: CGFloat = 375
    static var screenScale: CGFloat {
        UIScreen.main.bounds.width / baseWidth
    }
    static func s(_ value: CGFloat) -> CGFloat {
        round(value * screenScale)
    }

    enum Color {
        // Primary
        static let primary = UIColor(hex: "#A6DA95")!
        static let primaryDark = UIColor(hex: "#6f9163")!
        static let primaryLight50 = UIColor(red: 166/255, green: 218/255, blue: 149/255, alpha: 0.5)
        static let primaryLight30 = UIColor(red: 166/255, green: 218/255, blue: 149/255, alpha: 0.3)
        static let primaryLight10 = UIColor(red: 166/255, green: 218/255, blue: 149/255, alpha: 0.1)

        // Background
        static let background = UIColor.white
        static let surface = UIColor(hex: "#F7F7F7")!
        static let border = UIColor(hex: "#E0E0E0")!
        static let disabled = UIColor(hex: "#ECECEC")!

        // Text
        static let textPrimary = UIColor(hex: "#272A26")!
        static let textSecondary = UIColor(red: 39/255, green: 42/255, blue: 38/255, alpha: 0.5)
        static let textLight10 = UIColor(red: 0, green: 0, blue: 0, alpha: 0.1)
        static let textLight20 = UIColor(red: 39/255, green: 42/255, blue: 38/255, alpha: 0.2)
        static let textLight5 = UIColor(red: 39/255, green: 42/255, blue: 38/255, alpha: 0.05)

        // Alert
        static let alert = UIColor(hex: "#FF9F9F")!

        // Overlay
        static let overlay = UIColor(red: 0, green: 0, blue: 0, alpha: 0.5)
        static let overlayLight = UIColor(red: 0, green: 0, blue: 0, alpha: 0.3)

        // Bubble
        static let myBubble = primaryLight50       // 내 말풍선
        static let otherBubble = textLight10       // 상대 말풍선
        static let myBubbleText = textPrimary
        static let otherBubbleText = textPrimary

        // Profile circle
        static let profileCircle = primary
        static let profileIcon = UIColor(hex: "#F7FFF3")!  // colors.green
    }

    enum Font {
        // Baloo2 폰트 (앱에 추가 필요)
        static func regular(size: CGFloat) -> UIFont {
            UIFont(name: "Baloo2-Regular", size: size) ?? .systemFont(ofSize: size)
        }
        static func bold(size: CGFloat) -> UIFont {
            UIFont(name: "Baloo2-Bold", size: size) ?? .boldSystemFont(ofSize: size)
        }
    }

    enum FontSize {
        static var xs: CGFloat { ChatTheme.s(6) }
        static var sm: CGFloat { ChatTheme.s(8) }
        static var md: CGFloat { ChatTheme.s(10) }
        static var lg: CGFloat { ChatTheme.s(12) }
        static var xl: CGFloat { ChatTheme.s(14) }
        static var xxl: CGFloat { ChatTheme.s(16) }
        static var title: CGFloat { ChatTheme.s(18) }
        static var heading: CGFloat { ChatTheme.s(20) }
    }

    enum Layout {
        static var bubbleCornerRadius: CGFloat { ChatTheme.s(16) }
        static var profileCircleSize: CGFloat { ChatTheme.s(38) }
        static var chatImageSize: CGFloat { ChatTheme.s(200) }
        static var replyBorderWidth: CGFloat { ChatTheme.s(3) }
    }
}

// MARK: - UIColor Hex 확장
extension UIColor {
    convenience init?(hex: String) {
        var h = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        if h.hasPrefix("#") { h.removeFirst() }
        guard h.count == 6, let val = UInt64(h, radix: 16) else { return nil }
        self.init(
            red: CGFloat((val >> 16) & 0xFF) / 255,
            green: CGFloat((val >> 8) & 0xFF) / 255,
            blue: CGFloat(val & 0xFF) / 255,
            alpha: 1
        )
    }
}
