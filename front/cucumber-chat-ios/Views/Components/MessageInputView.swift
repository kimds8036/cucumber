import UIKit

protocol MessageInputViewDelegate: AnyObject {
    func didTapSend(content: String, replyTo: ChatMessage?)
    func didTapImageAttach()
    func didBeginTyping()
    func didEndTyping()
}

class MessageInputView: UIView {
    weak var delegate: MessageInputViewDelegate?
    private var attachmentCount = 0
    private var bottomPaddingConstraint: NSLayoutConstraint!
    private var inputHeightConstraint: NSLayoutConstraint!

    private let topBorder: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = UIColor(hex: "#E0E0E0")
        return v
    }()

    private let bottomInputRow = UIView()
    private let bottomInputInner = UIView()
    private let textInputBackground = UIView()
    private let textView = UITextView()
    private let placeholderLabel = UILabel()

    private let sendButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setImage(UIImage(systemName: "arrow.up"), for: .normal)
        b.tintColor = ChatTheme.Color.background
        b.backgroundColor = ChatTheme.Color.primary
        b.layer.cornerRadius = ChatTheme.s(22)
        b.isEnabled = false
        b.alpha = 0.5
        return b
    }()

    private let imageAttachButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setImage(UIImage(systemName: "image"), for: .normal)
        b.tintColor = ChatTheme.Color.textSecondary
        return b
    }()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    required init?(coder: NSCoder) { fatalError() }

    private func setupUI() {
        backgroundColor = ChatTheme.Color.background
        translatesAutoresizingMaskIntoConstraints = false
        bottomInputRow.translatesAutoresizingMaskIntoConstraints = false
        bottomInputInner.translatesAutoresizingMaskIntoConstraints = false
        textInputBackground.translatesAutoresizingMaskIntoConstraints = false
        textInputBackground.backgroundColor = ChatTheme.Color.textLight5
        textInputBackground.layer.cornerRadius = ChatTheme.s(24)
        textInputBackground.layer.masksToBounds = true

        textView.translatesAutoresizingMaskIntoConstraints = false
        textView.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.xl)
        textView.textColor = ChatTheme.Color.textPrimary
        textView.backgroundColor = .clear
        textView.textContainerInset = UIEdgeInsets(top: ChatTheme.s(12), left: ChatTheme.s(12), bottom: ChatTheme.s(12), right: ChatTheme.s(12))
        textView.textContainer.lineFragmentPadding = 0
        textView.isScrollEnabled = false

        placeholderLabel.translatesAutoresizingMaskIntoConstraints = false
        placeholderLabel.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.xl)
        placeholderLabel.textColor = ChatTheme.Color.textSecondary
        placeholderLabel.numberOfLines = 1

        addSubview(topBorder)
        addSubview(bottomInputRow)
        bottomInputRow.addSubview(bottomInputInner)
        bottomInputInner.addSubview(imageAttachButton)
        bottomInputInner.addSubview(textInputBackground)
        textInputBackground.addSubview(textView)
        textInputBackground.addSubview(placeholderLabel)
        bottomInputInner.addSubview(sendButton)

        bottomPaddingConstraint = bottomInputRow.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -ChatTheme.s(12))
        inputHeightConstraint = textInputBackground.heightAnchor.constraint(greaterThanOrEqualToConstant: ChatTheme.s(44))

        NSLayoutConstraint.activate([
            topBorder.topAnchor.constraint(equalTo: topAnchor),
            topBorder.leadingAnchor.constraint(equalTo: leadingAnchor),
            topBorder.trailingAnchor.constraint(equalTo: trailingAnchor),
            topBorder.heightAnchor.constraint(equalToConstant: 1),

            bottomInputRow.topAnchor.constraint(equalTo: topBorder.bottomAnchor),
            bottomInputRow.leadingAnchor.constraint(equalTo: leadingAnchor),
            bottomInputRow.trailingAnchor.constraint(equalTo: trailingAnchor),
            bottomPaddingConstraint,

            // board.style.js bottomInputRow: paddingHorizontal 3%, paddingVertical 12
            bottomInputInner.topAnchor.constraint(equalTo: bottomInputRow.topAnchor, constant: ChatTheme.s(12)),
            bottomInputInner.leadingAnchor.constraint(equalTo: bottomInputRow.leadingAnchor, constant: UIScreen.main.bounds.width * 0.03),
            bottomInputInner.trailingAnchor.constraint(equalTo: bottomInputRow.trailingAnchor, constant: -(UIScreen.main.bounds.width * 0.03)),
            bottomInputInner.bottomAnchor.constraint(equalTo: bottomInputRow.bottomAnchor, constant: -ChatTheme.s(12)),

            imageAttachButton.leadingAnchor.constraint(equalTo: bottomInputInner.leadingAnchor),
            imageAttachButton.centerYAnchor.constraint(equalTo: textInputBackground.centerYAnchor),
            imageAttachButton.widthAnchor.constraint(equalToConstant: ChatTheme.s(36)),
            imageAttachButton.heightAnchor.constraint(equalToConstant: ChatTheme.s(36)),

            textInputBackground.topAnchor.constraint(equalTo: bottomInputInner.topAnchor),
            textInputBackground.leadingAnchor.constraint(equalTo: imageAttachButton.trailingAnchor, constant: ChatTheme.s(6)),
            textInputBackground.trailingAnchor.constraint(equalTo: sendButton.leadingAnchor, constant: -ChatTheme.s(10)),
            inputHeightConstraint,
            textInputBackground.bottomAnchor.constraint(equalTo: bottomInputInner.bottomAnchor),

            textView.topAnchor.constraint(equalTo: textInputBackground.topAnchor),
            textView.leadingAnchor.constraint(equalTo: textInputBackground.leadingAnchor),
            textView.trailingAnchor.constraint(equalTo: textInputBackground.trailingAnchor),
            textView.bottomAnchor.constraint(equalTo: textInputBackground.bottomAnchor),

            placeholderLabel.leadingAnchor.constraint(equalTo: textInputBackground.leadingAnchor, constant: ChatTheme.s(16)),
            placeholderLabel.topAnchor.constraint(equalTo: textInputBackground.topAnchor, constant: ChatTheme.s(12)),
            placeholderLabel.trailingAnchor.constraint(lessThanOrEqualTo: textInputBackground.trailingAnchor, constant: -ChatTheme.s(16)),

            sendButton.trailingAnchor.constraint(equalTo: bottomInputInner.trailingAnchor),
            sendButton.centerYAnchor.constraint(equalTo: textInputBackground.centerYAnchor),
            sendButton.widthAnchor.constraint(equalToConstant: ChatTheme.s(44)),
            sendButton.heightAnchor.constraint(equalToConstant: ChatTheme.s(44)),
        ])

        textView.delegate = self
        sendButton.addTarget(self, action: #selector(tappedSend), for: .touchUpInside)
        imageAttachButton.addTarget(self, action: #selector(tappedImageAttach), for: .touchUpInside)
    }

    func setPlaceholder(_ text: String) {
        placeholderLabel.text = text
    }

    func setBottomPadding(_ value: CGFloat) {
        bottomPaddingConstraint.constant = -value
        layoutIfNeeded()
    }

    func setAttachmentCount(_ count: Int) {
        attachmentCount = max(0, count)
        imageAttachButton.tintColor = attachmentCount > 0 ? ChatTheme.Color.primary : ChatTheme.Color.textSecondary
        updateSendAvailability()
    }

    @objc private func tappedSend() {
        let text = textView.text?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if text.isEmpty && attachmentCount == 0 { return }
        delegate?.didTapSend(content: text, replyTo: nil)
        textView.text = ""
        updateInputHeight()
        updateSendAvailability()
    }

    @objc private func tappedImageAttach() {
        delegate?.didTapImageAttach()
    }

    private func updateSendAvailability() {
        let hasText = !(textView.text?.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ?? true)
        let canSend = hasText || attachmentCount > 0
        placeholderLabel.isHidden = hasText
        sendButton.isEnabled = canSend
        sendButton.alpha = canSend ? 1.0 : 0.5
    }

    private func updateInputHeight() {
        // CommentInput maxHeight normalize(80) 대응
        let maxHeight: CGFloat = ChatTheme.s(80)
        let fitting = textView.sizeThatFits(CGSize(width: textView.bounds.width, height: .greatestFiniteMagnitude))
        let clamped = min(max(ChatTheme.s(44), fitting.height), maxHeight)
        inputHeightConstraint.constant = clamped
    }
}

extension MessageInputView: UITextViewDelegate {
    func textViewDidBeginEditing(_ textView: UITextView) {
        delegate?.didBeginTyping()
    }
    func textViewDidEndEditing(_ textView: UITextView) {
        delegate?.didEndTyping()
    }
    func textViewDidChange(_ textView: UITextView) {
        updateInputHeight()
        updateSendAvailability()
    }
}
