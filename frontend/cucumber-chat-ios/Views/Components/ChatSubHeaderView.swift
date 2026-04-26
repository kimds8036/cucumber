import UIKit

// MARK: - ChatSubHeaderView (SubHeader.jsx 대응)
class ChatSubHeaderView: UIView {

    private var onBack: (() -> Void)?
    private var onRightPress: (() -> Void)?

    private let topContainer: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        return v
    }()

    private let headerTop: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        return v
    }()

    private let backButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setImage(UIImage(systemName: "chevron.back"), for: .normal)
        b.tintColor = ChatTheme.Color.textPrimary
        return b
    }()

    private let titleLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.bold(size: ChatTheme.FontSize.heading)
        l.textColor = ChatTheme.Color.textPrimary
        l.textAlignment = .center
        l.numberOfLines = 1
        return l
    }()

    private let rightButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.tintColor = ChatTheme.Color.textPrimary
        b.isHidden = true
        return b
    }()

    private let rightTextLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.bold(size: ChatTheme.FontSize.xxl)
        l.textColor = ChatTheme.Color.primaryDark
        l.textAlignment = .center
        l.isHidden = true
        return l
    }()

    private let divider: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.textLight20
        return v
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    required init?(coder: NSCoder) { fatalError() }

    private func setupUI() {
        backgroundColor = ChatTheme.Color.background

        addSubview(topContainer)
        topContainer.addSubview(headerTop)
        headerTop.addSubview(backButton)
        headerTop.addSubview(titleLabel)
        headerTop.addSubview(rightButton)
        rightButton.addSubview(rightTextLabel)
        addSubview(divider)

        NSLayoutConstraint.activate([
            topContainer.topAnchor.constraint(equalTo: topAnchor),
            topContainer.leadingAnchor.constraint(equalTo: leadingAnchor),
            topContainer.trailingAnchor.constraint(equalTo: trailingAnchor),

            // SubHeader.jsx: paddingTop 10, paddingHorizontal 8%
            headerTop.topAnchor.constraint(equalTo: topContainer.topAnchor, constant: ChatTheme.s(10)),
            headerTop.leadingAnchor.constraint(equalTo: topContainer.leadingAnchor, constant: UIScreen.main.bounds.width * 0.08),
            headerTop.trailingAnchor.constraint(equalTo: topContainer.trailingAnchor, constant: -(UIScreen.main.bounds.width * 0.08)),
            headerTop.heightAnchor.constraint(equalToConstant: ChatTheme.s(30)),
            headerTop.bottomAnchor.constraint(equalTo: topContainer.bottomAnchor, constant: -ChatTheme.s(10)),

            backButton.leadingAnchor.constraint(equalTo: headerTop.leadingAnchor, constant: -ChatTheme.s(5)),
            backButton.centerYAnchor.constraint(equalTo: headerTop.centerYAnchor),
            backButton.widthAnchor.constraint(equalToConstant: ChatTheme.s(28)),
            backButton.heightAnchor.constraint(equalToConstant: ChatTheme.s(28)),

            titleLabel.centerXAnchor.constraint(equalTo: headerTop.centerXAnchor),
            titleLabel.centerYAnchor.constraint(equalTo: headerTop.centerYAnchor),
            titleLabel.leadingAnchor.constraint(greaterThanOrEqualTo: backButton.trailingAnchor, constant: ChatTheme.s(8)),

            rightButton.trailingAnchor.constraint(equalTo: headerTop.trailingAnchor, constant: -ChatTheme.s(5)),
            rightButton.centerYAnchor.constraint(equalTo: headerTop.centerYAnchor),
            rightButton.widthAnchor.constraint(greaterThanOrEqualToConstant: ChatTheme.s(22)),
            rightButton.heightAnchor.constraint(equalToConstant: ChatTheme.s(28)),

            rightTextLabel.centerXAnchor.constraint(equalTo: rightButton.centerXAnchor),
            rightTextLabel.centerYAnchor.constraint(equalTo: rightButton.centerYAnchor),
            rightTextLabel.leadingAnchor.constraint(equalTo: rightButton.leadingAnchor),
            rightTextLabel.trailingAnchor.constraint(equalTo: rightButton.trailingAnchor),

            divider.topAnchor.constraint(equalTo: topContainer.bottomAnchor),
            divider.leadingAnchor.constraint(equalTo: leadingAnchor),
            divider.trailingAnchor.constraint(equalTo: trailingAnchor),
            divider.bottomAnchor.constraint(equalTo: bottomAnchor),
            divider.heightAnchor.constraint(equalToConstant: ChatTheme.s(1)),
        ])

        backButton.addTarget(self, action: #selector(tappedBack), for: .touchUpInside)
        rightButton.addTarget(self, action: #selector(tappedRight), for: .touchUpInside)
    }

    func configure(
        title: String,
        subtitle: String? = nil,
        rightButtonText: String? = nil,
        onBack: (() -> Void)?,
        onRightPress: (() -> Void)? = nil
    ) {
        self.onBack = onBack
        self.onRightPress = onRightPress
        titleLabel.text = title

        // SubHeader.jsx right button 표시 규칙 대응
        if let text = rightButtonText, !text.isEmpty {
            rightButton.isHidden = false
            rightTextLabel.isHidden = false
            rightTextLabel.text = text
        } else {
            rightButton.isHidden = true
            rightTextLabel.isHidden = true
            rightTextLabel.text = nil
        }

        _ = subtitle
    }

    @objc private func tappedBack() { onBack?() }
    @objc private func tappedRight() { onRightPress?() }
}
