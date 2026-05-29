import UIKit

// MARK: - Action (MessageLongPressMenu.jsx 액션 대응)
enum LongPressAction {
    case copy
    case reply
    case delete
}

// MARK: - ChatLongPressMenuView (MessageLongPressMenu.jsx 1:1 대응)
class ChatLongPressMenuView: UIView {

    private var onAction: ((LongPressAction) -> Void)?
    private var currentMsg: ChatMessage?

    // MARK: - UI
    // overlayFill 대응
    private let overlayView: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.overlayLight
        v.alpha = 0
        return v
    }()

    // anchorWrap + shadowWrap + cardStyle 대응
    private let menuCard: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = UIColor.white.withAlphaComponent(0.97)
        v.layer.cornerRadius = ChatTheme.s(12)
        v.layer.borderWidth = 1
        v.layer.borderColor = UIColor(hex: "#E0E0E0")?.cgColor
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.08
        v.layer.shadowRadius = ChatTheme.s(8)
        v.layer.shadowOffset = CGSize(width: 0, height: ChatTheme.s(2))
        v.transform = CGAffineTransform(scaleX: 0.94, y: 0.94)
        v.alpha = 0
        return v
    }()

    private let menuStack: UIStackView = {
        let s = UIStackView()
        s.translatesAutoresizingMaskIntoConstraints = false
        s.axis = .vertical
        s.spacing = 0
        return s
    }()

    // 삭제 확인 카드 (deleteConfirm 대응)
    private let confirmCard: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = UIColor.white.withAlphaComponent(0.97)
        v.layer.cornerRadius = ChatTheme.s(12)
        v.layer.borderWidth = 1
        v.layer.borderColor = UIColor(hex: "#E0E0E0")?.cgColor
        v.layer.shadowColor = UIColor.black.cgColor
        v.layer.shadowOpacity = 0.08
        v.layer.shadowRadius = ChatTheme.s(8)
        v.layer.shadowOffset = CGSize(width: 0, height: ChatTheme.s(2))
        v.transform = CGAffineTransform(scaleX: 0.96, y: 0.96)
        v.alpha = 0
        v.isHidden = true
        return v
    }()

    private let confirmTitleLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.text = "메시지 삭제"
        l.font = ChatTheme.Font.bold(size: ChatTheme.s(17))
        l.textColor = ChatTheme.Color.textPrimary
        return l
    }()

    private let confirmBodyLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.text = "이 메시지를 삭제하시겠어요?\n상대방 화면에서도 삭제됩니다."
        l.font = ChatTheme.Font.regular(size: ChatTheme.s(14))
        l.textColor = ChatTheme.Color.textSecondary
        l.numberOfLines = 0
        return l
    }()

    private let confirmCancelButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setTitle("취소", for: .normal)
        b.titleLabel?.font = ChatTheme.Font.bold(size: ChatTheme.s(15))
        b.setTitleColor(ChatTheme.Color.textPrimary, for: .normal)
        b.layer.cornerRadius = ChatTheme.s(10)
        b.layer.borderWidth = 1
        b.layer.borderColor = UIColor(hex: "#E0E0E0")?.cgColor
        return b
    }()

    private let confirmDeleteButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setTitle("삭제", for: .normal)
        b.titleLabel?.font = ChatTheme.Font.bold(size: ChatTheme.s(15))
        b.setTitleColor(UIColor(hex: "#C62828"), for: .normal)
        b.layer.cornerRadius = ChatTheme.s(10)
        b.layer.borderWidth = 1
        b.layer.borderColor = UIColor(hex: "#E0E0E0")?.cgColor
        return b
    }()

    // MARK: - Constraints
    private var menuCardCenterY: NSLayoutConstraint!

    // MARK: - Init
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Setup
    private func setupUI() {
        translatesAutoresizingMaskIntoConstraints = false

        addSubview(overlayView)
        addSubview(menuCard)
        menuCard.addSubview(menuStack)
        addSubview(confirmCard)

        // 삭제 확인 카드 내부
        let confirmButtonRow = UIStackView(arrangedSubviews: [confirmCancelButton, confirmDeleteButton])
        confirmButtonRow.translatesAutoresizingMaskIntoConstraints = false
        confirmButtonRow.axis = .horizontal
        confirmButtonRow.spacing = ChatTheme.s(10)
        confirmButtonRow.distribution = .fillEqually
        confirmCard.addSubview(confirmTitleLabel)
        confirmCard.addSubview(confirmBodyLabel)
        confirmCard.addSubview(confirmButtonRow)

        menuCardCenterY = menuCard.centerYAnchor.constraint(equalTo: centerYAnchor)

        NSLayoutConstraint.activate([
            overlayView.topAnchor.constraint(equalTo: topAnchor),
            overlayView.bottomAnchor.constraint(equalTo: bottomAnchor),
            overlayView.leadingAnchor.constraint(equalTo: leadingAnchor),
            overlayView.trailingAnchor.constraint(equalTo: trailingAnchor),

            menuCard.centerXAnchor.constraint(equalTo: centerXAnchor),
            menuCardCenterY,
            menuCard.widthAnchor.constraint(equalToConstant: ChatTheme.s(216)),

            menuStack.topAnchor.constraint(equalTo: menuCard.topAnchor, constant: ChatTheme.s(4)),
            menuStack.bottomAnchor.constraint(equalTo: menuCard.bottomAnchor, constant: -ChatTheme.s(4)),
            menuStack.leadingAnchor.constraint(equalTo: menuCard.leadingAnchor),
            menuStack.trailingAnchor.constraint(equalTo: menuCard.trailingAnchor),

            confirmCard.centerXAnchor.constraint(equalTo: centerXAnchor),
            confirmCard.centerYAnchor.constraint(equalTo: centerYAnchor),
            confirmCard.widthAnchor.constraint(equalToConstant: ChatTheme.s(300)),

            confirmTitleLabel.topAnchor.constraint(equalTo: confirmCard.topAnchor, constant: ChatTheme.s(18)),
            confirmTitleLabel.leadingAnchor.constraint(equalTo: confirmCard.leadingAnchor, constant: ChatTheme.s(18)),
            confirmTitleLabel.trailingAnchor.constraint(equalTo: confirmCard.trailingAnchor, constant: -ChatTheme.s(18)),

            confirmBodyLabel.topAnchor.constraint(equalTo: confirmTitleLabel.bottomAnchor, constant: ChatTheme.s(8)),
            confirmBodyLabel.leadingAnchor.constraint(equalTo: confirmCard.leadingAnchor, constant: ChatTheme.s(18)),
            confirmBodyLabel.trailingAnchor.constraint(equalTo: confirmCard.trailingAnchor, constant: -ChatTheme.s(18)),

            confirmButtonRow.topAnchor.constraint(equalTo: confirmBodyLabel.bottomAnchor, constant: ChatTheme.s(20)),
            confirmButtonRow.leadingAnchor.constraint(equalTo: confirmCard.leadingAnchor, constant: ChatTheme.s(18)),
            confirmButtonRow.trailingAnchor.constraint(equalTo: confirmCard.trailingAnchor, constant: -ChatTheme.s(18)),
            confirmButtonRow.bottomAnchor.constraint(equalTo: confirmCard.bottomAnchor, constant: -ChatTheme.s(18)),
            confirmButtonRow.heightAnchor.constraint(equalToConstant: ChatTheme.s(44)),
        ])

        // 오버레이 탭 → 닫기
        let tap = UITapGestureRecognizer(target: self, action: #selector(dismiss))
        overlayView.addGestureRecognizer(tap)

        confirmCancelButton.addTarget(self, action: #selector(cancelDelete), for: .touchUpInside)
        confirmDeleteButton.addTarget(self, action: #selector(confirmDelete), for: .touchUpInside)
    }

    // MARK: - Show
    func show(for message: ChatMessage, in parentView: UIView, onAction: @escaping (LongPressAction) -> Void) {
        self.currentMsg = message
        self.onAction = onAction

        buildMenu(canCopy: message.content != nil && !message.content!.isEmpty,
                  canDelete: message.isMe && !message.isDeleted)

        parentView.addSubview(self)
        NSLayoutConstraint.activate([
            topAnchor.constraint(equalTo: parentView.topAnchor),
            bottomAnchor.constraint(equalTo: parentView.bottomAnchor),
            leadingAnchor.constraint(equalTo: parentView.leadingAnchor),
            trailingAnchor.constraint(equalTo: parentView.trailingAnchor),
        ])

        // spring 애니메이션 (Animated.spring 대응)
        UIView.animate(withDuration: 0.2) {
            self.overlayView.alpha = 1
        }
        UIView.animate(
            withDuration: 0.35,
            delay: 0,
            usingSpringWithDamping: 0.7,
            initialSpringVelocity: 0.8,
            options: [],
            animations: {
                self.menuCard.alpha = 1
                self.menuCard.transform = .identity
            }
        )
    }

    // MARK: - Build Menu (MenuRow 대응)
    private func buildMenu(canCopy: Bool, canDelete: Bool) {
        menuStack.arrangedSubviews.forEach { $0.removeFromSuperview() }

        addMenuRow(icon: "doc.on.doc", label: "복사", action: .copy, disabled: !canCopy)
        addDivider()
        addMenuRow(icon: "arrowshape.turn.up.left", label: "답장", action: .reply)
        if canDelete {
            addDivider()
            addMenuRow(icon: "trash", label: "삭제", action: .delete, destructive: true)
        }
    }

    private func addMenuRow(icon: String, label: String, action: LongPressAction, disabled: Bool = false, destructive: Bool = false) {
        let row = UIButton(type: .system)
        row.translatesAutoresizingMaskIntoConstraints = false

        var config = UIButton.Configuration.plain()
        config.image = UIImage(systemName: icon)
        config.title = label
        config.imagePlacement = .leading
        config.imagePadding = ChatTheme.s(14)
        config.contentInsets = NSDirectionalEdgeInsets(top: ChatTheme.s(13), leading: ChatTheme.s(16), bottom: ChatTheme.s(13), trailing: ChatTheme.s(16))
        row.configuration = config
        row.contentHorizontalAlignment = .left

        let color: UIColor = destructive ? UIColor(hex: "#C62828")! : ChatTheme.Color.textPrimary
        row.tintColor = color
        row.setTitleColor(color, for: .normal)
        row.alpha = disabled ? 0.42 : 1.0
        row.isEnabled = !disabled
        row.heightAnchor.constraint(equalToConstant: ChatTheme.s(50)).isActive = true

        switch action {
        case .copy:   row.addTarget(self, action: #selector(tappedCopy), for: .touchUpInside)
        case .reply:  row.addTarget(self, action: #selector(tappedReply), for: .touchUpInside)
        case .delete: row.addTarget(self, action: #selector(tappedDelete), for: .touchUpInside)
        }
        menuStack.addArrangedSubview(row)
    }

    private func addDivider() {
        let line = UIView()
        line.translatesAutoresizingMaskIntoConstraints = false
        line.backgroundColor = UIColor(hex: "#E0E0E0")
        line.heightAnchor.constraint(equalToConstant: ChatTheme.s(0.5)).isActive = true
        menuStack.addArrangedSubview(line)
    }

    // MARK: - Actions
    @objc private func tappedCopy() {
        dismiss()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            self.onAction?(.copy)
        }
    }

    @objc private func tappedReply() {
        dismiss()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            self.onAction?(.reply)
        }
    }

    @objc private func tappedDelete() {
        // 삭제 확인 카드 표시 (deleteConfirm 대응)
        menuCard.isHidden = true
        confirmCard.isHidden = false
        UIView.animate(
            withDuration: 0.3,
            delay: 0,
            usingSpringWithDamping: 0.8,
            initialSpringVelocity: 0.8,
            options: [],
            animations: {
                self.confirmCard.alpha = 1
                self.confirmCard.transform = .identity
            }
        )
    }

    @objc private func cancelDelete() {
        // 메뉴로 돌아가기 (handleDeleteCancel 대응)
        confirmCard.isHidden = true
        confirmCard.alpha = 0
        confirmCard.transform = CGAffineTransform(scaleX: 0.96, y: 0.96)
        menuCard.isHidden = false
        UIView.animate(
            withDuration: 0.25,
            delay: 0,
            usingSpringWithDamping: 0.7,
            initialSpringVelocity: 0.8,
            options: [],
            animations: {
                self.menuCard.alpha = 1
                self.menuCard.transform = .identity
            }
        )
    }

    @objc private func confirmDelete() {
        dismiss()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
            self.onAction?(.delete)
        }
    }

    @objc private func dismiss() {
        UIView.animate(withDuration: 0.2, animations: {
            self.overlayView.alpha = 0
            self.menuCard.alpha = 0
            self.menuCard.transform = CGAffineTransform(scaleX: 0.94, y: 0.94)
            self.confirmCard.alpha = 0
        }) { _ in
            self.removeFromSuperview()
        }
    }
}
