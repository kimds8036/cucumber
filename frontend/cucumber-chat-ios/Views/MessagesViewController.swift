import UIKit

// MARK: - MessagesViewController (Message.jsx 1:1 대응)
class MessagesViewController: UIViewController {

    // MARK: - State (Message.jsx state 대응)
    private var messageType: MessageTab = .note   // "note" | "mail"
    private var noteRooms: [ChatRoom] = []
    private var mails: [PersonalMail] = []
    private var isLoadingNote = false
    private var isLoadingMail = false

    enum MessageTab { case note, mail }

    // MARK: - UI
    // 슬라이딩 pill 토글 (toggleContainer 대응)
    private let toggleContainer: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        return v
    }()

    private let toggleTrack: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.background
        v.layer.cornerRadius = ChatTheme.s(20)
        v.layer.borderWidth = 1
        v.layer.borderColor = ChatTheme.Color.primaryLight50.cgColor
        return v
    }()

    private let togglePill: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.primary
        v.layer.cornerRadius = ChatTheme.s(18)
        return v
    }()

    private let noteButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setTitle("쪽지·DM", for: .normal)
        b.titleLabel?.font = ChatTheme.Font.bold(size: ChatTheme.FontSize.xl)
        return b
    }()

    private let mailButton: UIButton = {
        let b = UIButton(type: .system)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.setTitle("우편", for: .normal)
        b.titleLabel?.font = ChatTheme.Font.bold(size: ChatTheme.FontSize.xl)
        return b
    }()

    private let tableView: UITableView = {
        let tv = UITableView()
        tv.translatesAutoresizingMaskIntoConstraints = false
        tv.separatorStyle = .none
        tv.backgroundColor = ChatTheme.Color.background
        tv.rowHeight = UITableView.automaticDimension
        tv.estimatedRowHeight = ChatTheme.s(72)
        return tv
    }()

    private let refreshControl = UIRefreshControl()

    // pill 위치 constraint
    private var pillLeadingConstraint: NSLayoutConstraint!

    // MARK: - Lifecycle
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ChatTheme.Color.background
        setupUI()
        setupSocket()
        fetchData()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        ChatSocketManager.shared.delegate = nil
    }

    // MARK: - Setup
    private func setupUI() {
        // 토글
        toggleTrack.addSubview(togglePill)
        toggleTrack.addSubview(noteButton)
        toggleTrack.addSubview(mailButton)
        toggleContainer.addSubview(toggleTrack)
        view.addSubview(toggleContainer)
        view.addSubview(tableView)

        pillLeadingConstraint = togglePill.leadingAnchor.constraint(equalTo: toggleTrack.leadingAnchor)

        NSLayoutConstraint.activate([
            toggleContainer.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor, constant: ChatTheme.s(8)),
            toggleContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: view.bounds.width * 0.1),
            toggleContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -view.bounds.width * 0.1),
            toggleContainer.heightAnchor.constraint(equalToConstant: ChatTheme.s(40)),

            toggleTrack.topAnchor.constraint(equalTo: toggleContainer.topAnchor),
            toggleTrack.leadingAnchor.constraint(equalTo: toggleContainer.leadingAnchor),
            toggleTrack.trailingAnchor.constraint(equalTo: toggleContainer.trailingAnchor),
            toggleTrack.bottomAnchor.constraint(equalTo: toggleContainer.bottomAnchor),

            pillLeadingConstraint,
            togglePill.topAnchor.constraint(equalTo: toggleTrack.topAnchor),
            togglePill.bottomAnchor.constraint(equalTo: toggleTrack.bottomAnchor),
            togglePill.widthAnchor.constraint(equalTo: toggleTrack.widthAnchor, multiplier: 0.5),

            noteButton.leadingAnchor.constraint(equalTo: toggleTrack.leadingAnchor),
            noteButton.topAnchor.constraint(equalTo: toggleTrack.topAnchor),
            noteButton.bottomAnchor.constraint(equalTo: toggleTrack.bottomAnchor),
            noteButton.widthAnchor.constraint(equalTo: toggleTrack.widthAnchor, multiplier: 0.5),

            mailButton.trailingAnchor.constraint(equalTo: toggleTrack.trailingAnchor),
            mailButton.topAnchor.constraint(equalTo: toggleTrack.topAnchor),
            mailButton.bottomAnchor.constraint(equalTo: toggleTrack.bottomAnchor),
            mailButton.widthAnchor.constraint(equalTo: toggleTrack.widthAnchor, multiplier: 0.5),

            tableView.topAnchor.constraint(equalTo: toggleContainer.bottomAnchor, constant: ChatTheme.s(8)),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
        ])

        tableView.delegate = self
        tableView.dataSource = self
        tableView.register(NoteRoomCell.self, forCellReuseIdentifier: NoteRoomCell.id)
        tableView.register(MailCell.self, forCellReuseIdentifier: MailCell.id)

        refreshControl.addTarget(self, action: #selector(handleRefresh), for: .valueChanged)
        tableView.refreshControl = refreshControl

        noteButton.addTarget(self, action: #selector(tappedNote), for: .touchUpInside)
        mailButton.addTarget(self, action: #selector(tappedMail), for: .touchUpInside)

        updateToggleAppearance(animated: false)
    }

    private func setupSocket() {
        ChatSocketManager.shared.delegate = self
    }

    // MARK: - Tab 전환 (handleMessageTypeChange 대응)
    @objc private func tappedNote() {
        guard messageType != .note else { return }
        messageType = .note
        updateToggleAppearance(animated: true)
        fetchData()
    }

    @objc private func tappedMail() {
        guard messageType != .mail else { return }
        messageType = .mail
        updateToggleAppearance(animated: true)
        fetchData()
    }

    private func updateToggleAppearance(animated: Bool) {
        let isNote = messageType == .note
        let targetLeading: CGFloat = isNote ? 0 : toggleTrack.bounds.width / 2

        noteButton.setTitleColor(isNote ? ChatTheme.Color.background : ChatTheme.Color.textSecondary, for: .normal)
        mailButton.setTitleColor(isNote ? ChatTheme.Color.textSecondary : ChatTheme.Color.background, for: .normal)

        pillLeadingConstraint.constant = targetLeading
        if animated {
            UIView.animate(withDuration: 0.25) { self.toggleTrack.layoutIfNeeded() }
        }
    }

    // MARK: - Fetch (fetchRooms / fetchMails 대응)
    private func fetchData() {
        switch messageType {
        case .note: fetchRooms()
        case .mail: fetchMails()
        }
    }

    private func fetchRooms() {
        guard !isLoadingNote else { return }
        isLoadingNote = true
        Task {
            async let dm = try ChatAPIService.shared.fetchDMRooms()
            async let msg = try ChatAPIService.shared.fetchMessageRooms()
            do {
                let (dmRooms, msgRooms) = try await (dm, msg)
                let merged = (dmRooms + msgRooms).sorted {
                    ($0.lastMessageAt ?? "") > ($1.lastMessageAt ?? "")
                }
                await MainActor.run {
                    self.noteRooms = merged
                    self.isLoadingNote = false
                    self.refreshControl.endRefreshing()
                    self.tableView.reloadData()
                }
            } catch {
                await MainActor.run {
                    self.isLoadingNote = false
                    self.refreshControl.endRefreshing()
                }
            }
        }
    }

    private func fetchMails() {
        guard !isLoadingMail else { return }
        isLoadingMail = true
        Task {
            async let received = try ChatAPIService.shared.fetchReceivedMails()
            async let sent = try ChatAPIService.shared.fetchSentMails()
            do {
                let (r, s) = try await (received, sent)
                let merged = (r + s).sorted {
                    ($0.lastMessageAt ?? "") > ($1.lastMessageAt ?? "")
                }
                await MainActor.run {
                    self.mails = merged
                    self.isLoadingMail = false
                    self.refreshControl.endRefreshing()
                    self.tableView.reloadData()
                }
            } catch {
                await MainActor.run {
                    self.isLoadingMail = false
                    self.refreshControl.endRefreshing()
                }
            }
        }
    }

    @objc private func handleRefresh() { fetchData() }

    // MARK: - Delete (confirmDelete 대응)
    private func confirmDelete(at indexPath: IndexPath) {
        let alert = UIAlertController(title: "삭제", message: "채팅방을 삭제하시겠어요?", preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "취소", style: .cancel))
        alert.addAction(UIAlertAction(title: "삭제", style: .destructive) { [weak self] _ in
            self?.performDelete(at: indexPath)
        })
        present(alert, animated: true)
    }

    private func performDelete(at indexPath: IndexPath) {
        Task {
            do {
                switch messageType {
                case .note:
                    let room = noteRooms[indexPath.row]
                    if room.roomType == "dm" {
                        try await ChatAPIService.shared.deleteDMRoom(roomId: room.id)
                    } else {
                        try await ChatAPIService.shared.deleteMessageRoom(roomId: room.id)
                    }
                    await MainActor.run {
                        self.noteRooms.remove(at: indexPath.row)
                        self.tableView.deleteRows(at: [indexPath], with: .left)
                    }
                case .mail:
                    let mail = mails[indexPath.row]
                    try await ChatAPIService.shared.deleteMailRoom(roomId: mail.id)
                    await MainActor.run {
                        self.mails.remove(at: indexPath.row)
                        self.tableView.deleteRows(at: [indexPath], with: .left)
                    }
                }
            } catch {
                print("삭제 실패: \(error)")
            }
        }
    }
}

// MARK: - TableView (listItem 스타일 대응)
extension MessagesViewController: UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        messageType == .note ? noteRooms.count : mails.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        switch messageType {
        case .note:
            let cell = tableView.dequeueReusableCell(withIdentifier: NoteRoomCell.id, for: indexPath) as! NoteRoomCell
            cell.configure(with: noteRooms[indexPath.row])
            return cell
        case .mail:
            let cell = tableView.dequeueReusableCell(withIdentifier: MailCell.id, for: indexPath) as! MailCell
            cell.configure(with: mails[indexPath.row])
            return cell
        }
    }

    func tableView(_ tableView: UITableView, didSelectRowAt indexPath: IndexPath) {
        tableView.deselectRow(at: indexPath, animated: true)
        let vc = ChatRoomViewController()
        switch messageType {
        case .note:
            let room = noteRooms[indexPath.row]
            vc.room = room
            vc.chatType = room.roomType
            vc.opponentName = room.otherUserNickname ?? "익명"
        case .mail:
            break // TODO: 우편 상세 연결
        }
        navigationController?.pushViewController(vc, animated: true)
    }

    // 스와이프 삭제 (SwipeableRow 대응)
    func tableView(_ tableView: UITableView, trailingSwipeActionsConfigurationForRowAt indexPath: IndexPath) -> UISwipeActionsConfiguration? {
        let delete = UIContextualAction(style: .destructive, title: "삭제") { [weak self] _, _, _ in
            self?.confirmDelete(at: indexPath)
        }
        return UISwipeActionsConfiguration(actions: [delete])
    }
}

// MARK: - Socket Delegate (new_message / notification 대응)
extension MessagesViewController: ChatSocketDelegate {
    func didReceiveNewMessage(_ message: ChatMessage, roomId: Int) { fetchRooms() }
    func didReceiveNotification() { fetchData() }
}

// MARK: - NoteRoomCell (listItem 스타일 대응)
class NoteRoomCell: UITableViewCell {
    static let id = "NoteRoomCell"

    private let profileCircle: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.primaryLight30
        v.layer.cornerRadius = ChatTheme.s(18)
        return v
    }()

    private let profileIcon: UIImageView = {
        let iv = UIImageView()
        iv.translatesAutoresizingMaskIntoConstraints = false
        iv.image = UIImage(systemName: "message.fill")
        iv.tintColor = ChatTheme.Color.primary
        iv.contentMode = .scaleAspectFit
        return iv
    }()

    private let nameLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.bold(size: ChatTheme.FontSize.xl)
        l.textColor = ChatTheme.Color.textPrimary
        return l
    }()

    private let previewLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.lg)
        l.textColor = ChatTheme.Color.textSecondary
        l.numberOfLines = 1
        return l
    }()

    private let timeLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.lg)
        l.textColor = ChatTheme.Color.textSecondary
        return l
    }()

    private let unreadBadge: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.alert
        v.layer.cornerRadius = ChatTheme.s(9)
        v.isHidden = true
        return v
    }()

    private let unreadLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.bold(size: ChatTheme.FontSize.md)
        l.textColor = ChatTheme.Color.background
        return l
    }()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = ChatTheme.Color.background

        profileCircle.addSubview(profileIcon)
        unreadBadge.addSubview(unreadLabel)
        contentView.addSubview(profileCircle)
        contentView.addSubview(nameLabel)
        contentView.addSubview(previewLabel)
        contentView.addSubview(timeLabel)
        contentView.addSubview(unreadBadge)

        NSLayoutConstraint.activate([
            profileCircle.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: ChatTheme.s(8)),
            profileCircle.centerYAnchor.constraint(equalTo: contentView.centerYAnchor),
            profileCircle.widthAnchor.constraint(equalToConstant: ChatTheme.s(36)),
            profileCircle.heightAnchor.constraint(equalToConstant: ChatTheme.s(36)),

            profileIcon.centerXAnchor.constraint(equalTo: profileCircle.centerXAnchor),
            profileIcon.centerYAnchor.constraint(equalTo: profileCircle.centerYAnchor),
            profileIcon.widthAnchor.constraint(equalToConstant: ChatTheme.s(18)),
            profileIcon.heightAnchor.constraint(equalToConstant: ChatTheme.s(18)),

            nameLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: ChatTheme.s(12)),
            nameLabel.leadingAnchor.constraint(equalTo: profileCircle.trailingAnchor, constant: ChatTheme.s(12)),
            nameLabel.trailingAnchor.constraint(equalTo: timeLabel.leadingAnchor, constant: -ChatTheme.s(8)),

            previewLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: ChatTheme.s(2)),
            previewLabel.leadingAnchor.constraint(equalTo: profileCircle.trailingAnchor, constant: ChatTheme.s(12)),
            previewLabel.trailingAnchor.constraint(equalTo: unreadBadge.leadingAnchor, constant: -ChatTheme.s(8)),
            previewLabel.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -ChatTheme.s(12)),

            timeLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -ChatTheme.s(8)),
            timeLabel.topAnchor.constraint(equalTo: nameLabel.topAnchor),

            unreadBadge.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -ChatTheme.s(8)),
            unreadBadge.topAnchor.constraint(equalTo: timeLabel.bottomAnchor, constant: ChatTheme.s(4)),
            unreadBadge.widthAnchor.constraint(greaterThanOrEqualToConstant: ChatTheme.s(18)),
            unreadBadge.heightAnchor.constraint(equalToConstant: ChatTheme.s(18)),

            unreadLabel.centerXAnchor.constraint(equalTo: unreadBadge.centerXAnchor),
            unreadLabel.centerYAnchor.constraint(equalTo: unreadBadge.centerYAnchor),
            unreadLabel.leadingAnchor.constraint(equalTo: unreadBadge.leadingAnchor, constant: ChatTheme.s(4)),
            unreadLabel.trailingAnchor.constraint(equalTo: unreadBadge.trailingAnchor, constant: -ChatTheme.s(4)),
        ])
    }
    required init?(coder: NSCoder) { fatalError() }

    func configure(with room: ChatRoom) {
        nameLabel.text = room.otherUserNickname ?? "익명"
        previewLabel.text = room.lastMessage ?? ""
        timeLabel.text = formatTime(room.lastMessageAt)
        if room.unreadCount > 0 {
            unreadBadge.isHidden = false
            unreadLabel.text = "\(room.unreadCount)"
        } else {
            unreadBadge.isHidden = true
        }
    }

    private func formatTime(_ iso: String?) -> String {
        guard let iso = iso else { return "" }
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        guard let date = f.date(from: iso) else { return "" }
        let df = DateFormatter()
        df.locale = Locale(identifier: "ko_KR")
        df.dateFormat = Calendar.current.isDateInToday(date) ? "a h:mm" : "M월 d일"
        return df.string(from: date)
    }
}

// MARK: - MailCell
class MailCell: UITableViewCell {
    static let id = "MailCell"

    private let nameLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.bold(size: ChatTheme.FontSize.xl)
        l.textColor = ChatTheme.Color.textPrimary
        return l
    }()

    private let previewLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.lg)
        l.textColor = ChatTheme.Color.textSecondary
        l.numberOfLines = 1
        return l
    }()

    private let timeLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.lg)
        l.textColor = ChatTheme.Color.textSecondary
        return l
    }()

    override init(style: UITableViewCell.CellStyle, reuseIdentifier: String?) {
        super.init(style: style, reuseIdentifier: reuseIdentifier)
        selectionStyle = .none
        backgroundColor = ChatTheme.Color.background
        contentView.addSubview(nameLabel)
        contentView.addSubview(previewLabel)
        contentView.addSubview(timeLabel)
        NSLayoutConstraint.activate([
            nameLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: ChatTheme.s(12)),
            nameLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: ChatTheme.s(16)),
            nameLabel.trailingAnchor.constraint(equalTo: timeLabel.leadingAnchor, constant: -ChatTheme.s(8)),

            previewLabel.topAnchor.constraint(equalTo: nameLabel.bottomAnchor, constant: ChatTheme.s(2)),
            previewLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: ChatTheme.s(16)),
            previewLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -ChatTheme.s(16)),
            previewLabel.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -ChatTheme.s(12)),

            timeLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -ChatTheme.s(8)),
            timeLabel.topAnchor.constraint(equalTo: nameLabel.topAnchor),
        ])
    }
    required init?(coder: NSCoder) { fatalError() }

    func configure(with mail: PersonalMail) {
        nameLabel.text = mail.senderNickname ?? "익명"
        previewLabel.text = mail.lastMessage ?? ""
        timeLabel.text = ""
    }
}
