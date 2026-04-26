import UIKit

// MARK: - MessageItemCell (MessageItem.jsx 1:1 대응)
class MessageItemCell: UITableViewCell {
    static let id = "MessageItemCell"

    var onLongPress: ((UIView) -> Void)?
    var onReplyTargetPress: ((Int) -> Void)?
    var onImagePress: ((String) -> Void)?

    // MARK: - UI Components
    // 상대방 프로필 원 (SenderProfile 대응)
    private let profileCircle: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.profileCircle
        v.layer.cornerRadius = ChatTheme.Layout.profileCircleSize / 2
        v.layer.masksToBounds = true
        return v
    }()

    private let profileIconView: UIImageView = {
        let iv = UIImageView()
        iv.translatesAutoresizingMaskIntoConstraints = false
        iv.image = UIImage(systemName: "message.fill")
        iv.tintColor = ChatTheme.Color.profileIcon
        iv.contentMode = .scaleAspectFit
        return iv
    }()

    // 프로필 스페이서 (chatProfileSpacer 대응)
    private let profileSpacer: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        return v
    }()

    // 상대방 이름 (opponentName 대응)
    private let nameLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.lg)
        l.textColor = ChatTheme.Color.textPrimary
        return l
    }()

    // 말풍선
    private let bubbleView: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.layer.cornerRadius = ChatTheme.Layout.bubbleCornerRadius
        v.layer.masksToBounds = true
        return v
    }()

    // 답장 인용구 (ReplyQuote 대응)
    private let replyQuoteView: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.layer.cornerRadius = ChatTheme.s(6)
        v.isHidden = true
        return v
    }()

    private let replyQuoteBorder: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.primary
        return v
    }()

    private let replyQuoteSenderLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.bold(size: ChatTheme.FontSize.lg)
        l.textColor = ChatTheme.Color.primary
        return l
    }()

    private let replyQuoteTextLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.lg)
        l.textColor = ChatTheme.Color.textSecondary
        l.numberOfLines = 1
        return l
    }()

    // 메시지 텍스트
    private let contentLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.xl)
        l.numberOfLines = 0
        return l
    }()

    // 이미지 스택
    private let imagesStack: UIStackView = {
        let s = UIStackView()
        s.translatesAutoresizingMaskIntoConstraints = false
        s.axis = .vertical
        s.spacing = ChatTheme.s(4)
        return s
    }()

    // 시간 레이블
    private let timeLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.lg)
        l.textColor = ChatTheme.Color.textSecondary
        return l
    }()

    // 읽음/전송 상태 (chatUnreadCount 대응)
    private let statusLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.bold(size: ChatTheme.FontSize.lg)
        l.textColor = ChatTheme.Color.primary
        return l
    }()

    // 전송실패 버튼
    private let retryButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setTitle("!", for: .normal)
        b.setTitleColor(ChatTheme.Color.alert, for: .normal)
        b.titleLabel?.font = ChatTheme.Font.bold(size: ChatTheme.s(14))
        b.isHidden = true
        return b
    }()

    // MARK: - Constraints (내/상대 전환)
    private var myConstraints: [NSLayoutConstraint] = []
    private var otherConstraints: [NSLayoutConstraint] = []
    private var currentMsg: ChatMessage?

    // MARK: - Init
    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        setupUI()
        setupGestures()
    }
    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Setup
    private func setupUI() {
        selectionStyle = .none
        backgroundColor = .clear
        contentView.backgroundColor = ChatTheme.Color.background

        profileCircle.addSubview(profileIconView)

        replyQuoteView.addSubview(replyQuoteBorder)
        replyQuoteView.addSubview(replyQuoteSenderLabel)
        replyQuoteView.addSubview(replyQuoteTextLabel)

        bubbleView.addSubview(replyQuoteView)
        bubbleView.addSubview(imagesStack)
        bubbleView.addSubview(contentLabel)

        contentView.addSubview(profileCircle)
        contentView.addSubview(profileSpacer)
        contentView.addSubview(nameLabel)
        contentView.addSubview(bubbleView)
        contentView.addSubview(timeLabel)
        contentView.addSubview(statusLabel)
        contentView.addSubview(retryButton)

        NSLayoutConstraint.activate([
            profileIconView.centerXAnchor.constraint(equalTo: profileCircle.centerXAnchor),
            profileIconView.centerYAnchor.constraint(equalTo: profileCircle.centerYAnchor),
            profileIconView.widthAnchor.constraint(equalToConstant: ChatTheme.s(20)),
            profileIconView.heightAnchor.constraint(equalToConstant: ChatTheme.s(20)),

            profileCircle.widthAnchor.constraint(equalToConstant: ChatTheme.Layout.profileCircleSize),
            profileCircle.heightAnchor.constraint(equalToConstant: ChatTheme.Layout.profileCircleSize),

            profileSpacer.widthAnchor.constraint(equalToConstant: ChatTheme.Layout.profileCircleSize),
            profileSpacer.heightAnchor.constraint(equalToConstant: ChatTheme.Layout.profileCircleSize),

            replyQuoteBorder.leadingAnchor.constraint(equalTo: replyQuoteView.leadingAnchor),
            replyQuoteBorder.topAnchor.constraint(equalTo: replyQuoteView.topAnchor),
            replyQuoteBorder.bottomAnchor.constraint(equalTo: replyQuoteView.bottomAnchor),
            replyQuoteBorder.widthAnchor.constraint(equalToConstant: ChatTheme.Layout.replyBorderWidth),

            replyQuoteSenderLabel.topAnchor.constraint(equalTo: replyQuoteView.topAnchor, constant: ChatTheme.s(6)),
            replyQuoteSenderLabel.leadingAnchor.constraint(equalTo: replyQuoteBorder.trailingAnchor, constant: ChatTheme.s(8)),
            replyQuoteSenderLabel.trailingAnchor.constraint(equalTo: replyQuoteView.trailingAnchor, constant: -ChatTheme.s(8)),

            replyQuoteTextLabel.topAnchor.constraint(equalTo: replyQuoteSenderLabel.bottomAnchor, constant: ChatTheme.s(2)),
            replyQuoteTextLabel.leadingAnchor.constraint(equalTo: replyQuoteBorder.trailingAnchor, constant: ChatTheme.s(8)),
            replyQuoteTextLabel.trailingAnchor.constraint(equalTo: replyQuoteView.trailingAnchor, constant: -ChatTheme.s(8)),
            replyQuoteTextLabel.bottomAnchor.constraint(equalTo: replyQuoteView.bottomAnchor, constant: -ChatTheme.s(6)),

            replyQuoteView.topAnchor.constraint(equalTo: bubbleView.topAnchor, constant: ChatTheme.s(5)),
            replyQuoteView.leadingAnchor.constraint(equalTo: bubbleView.leadingAnchor, constant: ChatTheme.s(10)),
            replyQuoteView.trailingAnchor.constraint(equalTo: bubbleView.trailingAnchor, constant: -ChatTheme.s(10)),

            imagesStack.topAnchor.constraint(equalTo: replyQuoteView.bottomAnchor, constant: ChatTheme.s(4)),
            imagesStack.leadingAnchor.constraint(equalTo: bubbleView.leadingAnchor),
            imagesStack.trailingAnchor.constraint(equalTo: bubbleView.trailingAnchor),

            contentLabel.topAnchor.constraint(equalTo: imagesStack.bottomAnchor, constant: ChatTheme.s(5)),
            contentLabel.leadingAnchor.constraint(equalTo: bubbleView.leadingAnchor, constant: ChatTheme.s(14)),
            contentLabel.trailingAnchor.constraint(equalTo: bubbleView.trailingAnchor, constant: -ChatTheme.s(14)),
            contentLabel.bottomAnchor.constraint(equalTo: bubbleView.bottomAnchor, constant: -ChatTheme.s(5)),
        ])
    }

    private func setupGestures() {
        let lp = UILongPressGestureRecognizer(target: self, action: #selector(handleLongPress(_:)))
        lp.minimumPressDuration = 0.4
        bubbleView.addGestureRecognizer(lp)
        bubbleView.isUserInteractionEnabled = true
    }

    @objc private func handleLongPress(_ g: UILongPressGestureRecognizer) {
        guard g.state == .began else { return }
        guard let msg = currentMsg, !msg.isDeleted, !msg.isSending else { return }
        onLongPress?(bubbleView)
    }

    // MARK: - Configure (MessageItem.jsx configure 대응)
    func configure(with msg: ChatMessage, opponentName: String) {
        currentMsg = msg
        NSLayoutConstraint.deactivate(myConstraints + otherConstraints)
        myConstraints = []
        otherConstraints = []

        // 답장 인용구
        if let parentContent = msg.parentContent, !parentContent.isEmpty {
            replyQuoteView.isHidden = false
            replyQuoteView.backgroundColor = ChatTheme.Color.textLight10
            replyQuoteSenderLabel.text = msg.parentSenderName ?? "답장"
            replyQuoteTextLabel.text = parentContent
            let tap = UITapGestureRecognizer(target: self, action: #selector(replyQuoteTapped))
            replyQuoteView.addGestureRecognizer(tap)
        } else {
            replyQuoteView.isHidden = true
        }

        // 이미지
        imagesStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        if !msg.images.isEmpty && !msg.isDeleted {
            for uri in msg.images {
                let imgView = UIImageView()
                imgView.translatesAutoresizingMaskIntoConstraints = false
                imgView.contentMode = .scaleAspectFill
                imgView.clipsToBounds = true
                imgView.layer.cornerRadius = ChatTheme.s(12)
                imgView.backgroundColor = ChatTheme.Color.textLight10
                imgView.heightAnchor.constraint(equalToConstant: ChatTheme.Layout.chatImageSize).isActive = true
                imgView.widthAnchor.constraint(equalToConstant: ChatTheme.Layout.chatImageSize).isActive = true
                if let url = URL(string: uri) {
                    URLSession.shared.dataTask(with: url) { data, _, _ in
                        if let data = data, let image = UIImage(data: data) {
                            DispatchQueue.main.async { imgView.image = image }
                        }
                    }.resume()
                }
                let tap = UITapGestureRecognizer(target: self, action: #selector(imageTapped(_:)))
                imgView.isUserInteractionEnabled = true
                imgView.addGestureRecognizer(tap)
                imgView.accessibilityIdentifier = uri
                imagesStack.addArrangedSubview(imgView)
            }
        }

        // 텍스트
        if msg.isDeleted {
            contentLabel.text = "삭제된 메시지입니다."
            contentLabel.textColor = ChatTheme.Color.textSecondary
            contentLabel.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.xl)
        } else if let content = msg.content, !content.isEmpty {
            contentLabel.text = content
            contentLabel.textColor = msg.isMe ? ChatTheme.Color.textPrimary : ChatTheme.Color.textPrimary
        } else {
            contentLabel.text = nil
        }

        // 시간
        timeLabel.text = msg.showTimestamp == true ? (msg.time ?? "") : ""

        // 읽음/상태
        if msg.isMe {
            if msg.isFailed || msg.status == "failed" {
                retryButton.isHidden = false
                statusLabel.text = ""
            } else {
                retryButton.isHidden = true
                statusLabel.text = (msg.isReadByOther == false && !msg.isSending) ? "1" : ""
            }
        } else {
            retryButton.isHidden = true
            statusLabel.text = ""
        }

        if msg.isMe {
            applyMyLayout(msg: msg)
        } else {
            applyOtherLayout(msg: msg, opponentName: opponentName)
        }
    }

    // MARK: - 내 메시지 레이아웃 (chatRowUser 대응)
    private func applyMyLayout(msg: ChatMessage) {
        profileCircle.isHidden = true
        profileSpacer.isHidden = true
        nameLabel.isHidden = true

        // 내 말풍선: primaryLight50, 우하단 radius 축소
        bubbleView.backgroundColor = ChatTheme.Color.myBubble
        bubbleView.layer.cornerRadius = ChatTheme.Layout.bubbleCornerRadius
        bubbleView.layer.maskedCorners = [.layerMinXMinYCorner, .layerMinXMaxYCorner, .layerMaxXMinYCorner]
        contentLabel.textColor = ChatTheme.Color.myBubbleText

        myConstraints = [
            bubbleView.topAnchor.constraint(equalTo: contentView.topAnchor, constant: msg.showProfile == false ? ChatTheme.s(2) : 0),
            bubbleView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -ChatTheme.s(8)),
            bubbleView.widthAnchor.constraint(lessThanOrEqualToConstant: UIScreen.main.bounds.width * 0.78),
            bubbleView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: msg.showTimestamp == false ? -ChatTheme.s(2) : -ChatTheme.s(14)),

            // 시간: 말풍선 왼쪽, 하단 정렬 (userTimeColumn 대응)
            timeLabel.trailingAnchor.constraint(equalTo: bubbleView.leadingAnchor, constant: -ChatTheme.s(7)),
            timeLabel.bottomAnchor.constraint(equalTo: bubbleView.bottomAnchor),

            statusLabel.trailingAnchor.constraint(equalTo: timeLabel.trailingAnchor),
            statusLabel.bottomAnchor.constraint(equalTo: timeLabel.topAnchor, constant: ChatTheme.s(2)),

            retryButton.trailingAnchor.constraint(equalTo: bubbleView.leadingAnchor, constant: -ChatTheme.s(4)),
            retryButton.centerYAnchor.constraint(equalTo: bubbleView.centerYAnchor),
        ]
        NSLayoutConstraint.activate(myConstraints)
    }

    // MARK: - 상대 메시지 레이아웃 (chatRowOpponent 대응)
    private func applyOtherLayout(msg: ChatMessage, opponentName: String) {
        // 상대 말풍선: textLight10, 좌상단 radius 축소
        bubbleView.backgroundColor = ChatTheme.Color.otherBubble
        bubbleView.layer.cornerRadius = ChatTheme.Layout.bubbleCornerRadius
        bubbleView.layer.maskedCorners = [.layerMaxXMinYCorner, .layerMaxXMaxYCorner, .layerMinXMaxYCorner]
        contentLabel.textColor = ChatTheme.Color.otherBubbleText

        let showProfile = msg.showProfile ?? true
        profileCircle.isHidden = !showProfile
        profileSpacer.isHidden = showProfile
        nameLabel.isHidden = !showProfile
        nameLabel.text = showProfile ? opponentName : nil

        otherConstraints = [
            // 프로필 or 스페이서
            (showProfile ? profileCircle : profileSpacer).leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: ChatTheme.s(8)),
            (showProfile ? profileCircle : profileSpacer).topAnchor.constraint(equalTo: contentView.topAnchor, constant: msg.showProfile == false ? ChatTheme.s(2) : 0),

            // 이름
            nameLabel.topAnchor.constraint(equalTo: (showProfile ? profileCircle : profileSpacer).topAnchor),
            nameLabel.leadingAnchor.constraint(equalTo: (showProfile ? profileCircle : profileSpacer).trailingAnchor, constant: ChatTheme.s(10)),

            // 말풍선
            bubbleView.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: showProfile ? ChatTheme.s(3) : 0),
            bubbleView.leadingAnchor.constraint(equalTo: (showProfile ? profileCircle : profileSpacer).trailingAnchor, constant: ChatTheme.s(10)),
            bubbleView.widthAnchor.constraint(lessThanOrEqualToConstant: UIScreen.main.bounds.width * 0.75),
            bubbleView.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: msg.showTimestamp == false ? -ChatTheme.s(2) : -ChatTheme.s(14)),

            // 시간: 말풍선 오른쪽, 하단 정렬 (chatTimeOpponent 대응)
            timeLabel.leadingAnchor.constraint(equalTo: bubbleView.trailingAnchor, constant: ChatTheme.s(7)),
            timeLabel.bottomAnchor.constraint(equalTo: bubbleView.bottomAnchor),
        ]
        NSLayoutConstraint.activate(otherConstraints)
    }

    // MARK: - Actions
    @objc private func replyQuoteTapped() {
        guard let parentId = currentMsg?.parentMessageId else { return }
        onReplyTargetPress?(parentId)
    }

    @objc private func imageTapped(_ g: UITapGestureRecognizer) {
        guard let uri = (g.view as? UIImageView)?.accessibilityIdentifier else { return }
        onImagePress?(uri)
    }

    override func prepareForReuse() {
        super.prepareForReuse()
        currentMsg = nil
        NSLayoutConstraint.deactivate(myConstraints + otherConstraints)
        myConstraints = []
        otherConstraints = []
        imagesStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
        replyQuoteView.isHidden = true
        contentLabel.text = nil
        timeLabel.text = nil
        statusLabel.text = nil
        retryButton.isHidden = true
        onLongPress = nil
        onReplyTargetPress = nil
        onImagePress = nil
    }
}

// MARK: - DateBannerCell (DateBanner.jsx 대응)
class DateBannerCell: UITableViewCell {
    static let id = "DateBannerCell"

    private let bannerLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.s(11))
        l.textColor = UIColor(hex: "#666666")
        return l
    }()

    private let pill: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = UIColor(hex: "#EEEEEE")
        v.layer.cornerRadius = ChatTheme.s(10)
        return v
    }()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = .clear
        pill.addSubview(bannerLabel)
        contentView.addSubview(pill)
        NSLayoutConstraint.activate([
            pill.centerXAnchor.constraint(equalTo: contentView.centerXAnchor),
            pill.topAnchor.constraint(equalTo: contentView.topAnchor, constant: ChatTheme.s(8)),
            pill.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -ChatTheme.s(8)),
            bannerLabel.topAnchor.constraint(equalTo: pill.topAnchor, constant: ChatTheme.s(4)),
            bannerLabel.bottomAnchor.constraint(equalTo: pill.bottomAnchor, constant: -ChatTheme.s(4)),
            bannerLabel.leadingAnchor.constraint(equalTo: pill.leadingAnchor, constant: ChatTheme.s(10)),
            bannerLabel.trailingAnchor.constraint(equalTo: pill.trailingAnchor, constant: -ChatTheme.s(10)),
        ])
    }
    required init?(coder: NSCoder) { fatalError() }

    func configure(dateKey: String) {
        bannerLabel.text = formatBannerDate(dateKey)
    }

    // DateBanner.jsx formatChatDateBanner 대응 (ko-KR full date)
    private func formatBannerDate(_ dateKey: String) -> String {
        let parts = dateKey.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return dateKey }
        let (y, m, d) = (parts[0], parts[1], parts[2])
        guard let target = Calendar.current.date(from: DateComponents(year: y, month: m, day: d)) else {
            return dateKey
        }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "ko-KR")
        formatter.dateFormat = "yyyy. MM. dd."
        return formatter.string(from: target)
    }
}
