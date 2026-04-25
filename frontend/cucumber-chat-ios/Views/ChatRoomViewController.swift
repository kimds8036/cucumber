import UIKit
import PhotosUI

class ChatRoomViewController: UIViewController {
    var room: ChatRoom?
    var chatType: String = "messages"
    var opponentName: String = "익명"

    private var messages: [ChatMessage] = []
    private var hasMore = true
    private var isLoading = false
    private var isLoadingMore = false
    private var replyToMessage: ChatMessage?
    private var pendingImages: [UploadImagePayload] = []

    private let headerView = ChatSubHeaderView()
    private let postCardView = PostCardView()
    private let tableView: UITableView = {
        let tv = UITableView()
        tv.translatesAutoresizingMaskIntoConstraints = false
        tv.separatorStyle = .none
        tv.backgroundColor = ChatTheme.Color.background
        tv.keyboardDismissMode = .onDrag
        tv.transform = CGAffineTransform(scaleX: 1, y: -1)
        return tv
    }()
    private let inputContainerView = MessageInputView()
    private let replyPreviewView = UIView()
    private let replyPreviewTitleLabel = UILabel()
    private let replyPreviewContentLabel = UILabel()
    private let replyCloseButton = UIButton(type: .system)
    private let toastView = UIView()
    private let toastLabel = UILabel()
    private let loadingOverlay = UIView()
    private let loadingIndicator = UIActivityIndicatorView(style: .large)
    private var pollingTimer: Timer?
    private var pollingInterval: TimeInterval = 5.0

    private var postCardHeightConstraint: NSLayoutConstraint!
    private var inputBottomConstraint: NSLayoutConstraint!
    private lazy var keyboardDismissTap: UITapGestureRecognizer = {
        let tap = UITapGestureRecognizer(target: self, action: #selector(handleBackgroundTapToDismissKeyboard))
        tap.cancelsTouchesInView = false
        tap.delegate = self
        return tap
    }()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = ChatTheme.Color.background
        navigationController?.setNavigationBarHidden(true, animated: false)
        setupUI()
        setupHeader()
        setupKeyboard()
        setupKeyboardDismissTap()
        setupSocket()
        fetchMessages()
        if chatType == "room" { fetchPostCard() }
        inputContainerView.setAttachmentCount(0)
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        if inputBottomConstraint.constant == 0 {
            inputContainerView.setBottomPadding(max(view.safeAreaInsets.bottom, ChatTheme.s(12)))
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        stopPolling()
        ChatSocketManager.shared.leaveCurrentRoom()
        ChatSocketManager.shared.delegate = nil
        if let roomId = room?.id {
            Task {
                if chatType == "dm" {
                    try? await ChatAPIService.shared.markDMRoomRead(roomId: roomId)
                } else {
                    try? await ChatAPIService.shared.markMessageRoomRead(roomId: roomId)
                }
            }
        }
    }

    private func setupUI() {
        headerView.translatesAutoresizingMaskIntoConstraints = false
        postCardView.translatesAutoresizingMaskIntoConstraints = false
        postCardView.isHidden = chatType != "room"
        inputContainerView.translatesAutoresizingMaskIntoConstraints = false
        inputContainerView.delegate = self

        replyPreviewView.translatesAutoresizingMaskIntoConstraints = false
        replyPreviewView.backgroundColor = ChatTheme.Color.surface
        replyPreviewView.isHidden = true
        replyPreviewView.layer.borderWidth = 1
        replyPreviewView.layer.borderColor = ChatTheme.Color.textLight5.cgColor
        replyPreviewTitleLabel.translatesAutoresizingMaskIntoConstraints = false
        replyPreviewTitleLabel.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.lg)
        replyPreviewTitleLabel.textColor = ChatTheme.Color.textSecondary
        replyPreviewContentLabel.translatesAutoresizingMaskIntoConstraints = false
        replyPreviewContentLabel.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.xl)
        replyPreviewContentLabel.textColor = ChatTheme.Color.textPrimary
        replyPreviewContentLabel.numberOfLines = 1
        replyCloseButton.translatesAutoresizingMaskIntoConstraints = false
        replyCloseButton.setImage(UIImage(systemName: "xmark.circle"), for: .normal)
        replyCloseButton.tintColor = ChatTheme.Color.textSecondary
        replyCloseButton.addTarget(self, action: #selector(clearReplyTarget), for: .touchUpInside)

        toastView.translatesAutoresizingMaskIntoConstraints = false
        toastView.backgroundColor = UIColor.white.withAlphaComponent(0.97)
        toastView.layer.borderWidth = 1
        toastView.layer.borderColor = ChatTheme.Color.border.cgColor
        toastView.layer.cornerRadius = ChatTheme.s(8)
        toastView.alpha = 0
        toastView.isHidden = true
        toastLabel.translatesAutoresizingMaskIntoConstraints = false
        toastLabel.font = ChatTheme.Font.regular(size: ChatTheme.FontSize.xl)
        toastLabel.textColor = ChatTheme.Color.textPrimary

        loadingOverlay.translatesAutoresizingMaskIntoConstraints = false
        loadingOverlay.backgroundColor = ChatTheme.Color.background
        loadingOverlay.isHidden = true
        loadingOverlay.alpha = 0
        loadingIndicator.translatesAutoresizingMaskIntoConstraints = false
        loadingIndicator.color = ChatTheme.Color.primary

        view.addSubview(headerView)
        view.addSubview(postCardView)
        view.addSubview(tableView)
        view.addSubview(replyPreviewView)
        view.addSubview(inputContainerView)
        view.addSubview(toastView)
        view.addSubview(loadingOverlay)

        replyPreviewView.addSubview(replyPreviewTitleLabel)
        replyPreviewView.addSubview(replyPreviewContentLabel)
        replyPreviewView.addSubview(replyCloseButton)
        toastView.addSubview(toastLabel)
        loadingOverlay.addSubview(loadingIndicator)

        postCardHeightConstraint = postCardView.heightAnchor.constraint(equalToConstant: 0)
        inputBottomConstraint = inputContainerView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor)

        NSLayoutConstraint.activate([
            headerView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            headerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            headerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            headerView.heightAnchor.constraint(equalToConstant: ChatTheme.s(40)),

            postCardView.topAnchor.constraint(equalTo: headerView.bottomAnchor),
            postCardView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            postCardView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            postCardHeightConstraint,

            tableView.topAnchor.constraint(equalTo: postCardView.bottomAnchor),
            tableView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            tableView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            tableView.bottomAnchor.constraint(equalTo: replyPreviewView.topAnchor),

            replyPreviewView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            replyPreviewView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            replyPreviewView.bottomAnchor.constraint(equalTo: inputContainerView.topAnchor),
            replyPreviewView.heightAnchor.constraint(equalToConstant: ChatTheme.s(52)),

            replyPreviewTitleLabel.topAnchor.constraint(equalTo: replyPreviewView.topAnchor, constant: ChatTheme.s(8)),
            replyPreviewTitleLabel.leadingAnchor.constraint(equalTo: replyPreviewView.leadingAnchor, constant: ChatTheme.s(12)),
            replyPreviewTitleLabel.trailingAnchor.constraint(equalTo: replyCloseButton.leadingAnchor, constant: -ChatTheme.s(8)),

            replyPreviewContentLabel.topAnchor.constraint(equalTo: replyPreviewTitleLabel.bottomAnchor, constant: ChatTheme.s(4)),
            replyPreviewContentLabel.leadingAnchor.constraint(equalTo: replyPreviewView.leadingAnchor, constant: ChatTheme.s(12)),
            replyPreviewContentLabel.trailingAnchor.constraint(equalTo: replyCloseButton.leadingAnchor, constant: -ChatTheme.s(8)),

            replyCloseButton.trailingAnchor.constraint(equalTo: replyPreviewView.trailingAnchor, constant: -ChatTheme.s(12)),
            replyCloseButton.centerYAnchor.constraint(equalTo: replyPreviewView.centerYAnchor),
            replyCloseButton.widthAnchor.constraint(equalToConstant: ChatTheme.s(24)),
            replyCloseButton.heightAnchor.constraint(equalToConstant: ChatTheme.s(24)),

            inputContainerView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            inputContainerView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            inputBottomConstraint,

            toastView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            toastView.bottomAnchor.constraint(equalTo: inputContainerView.topAnchor, constant: -ChatTheme.s(100)),
            toastLabel.topAnchor.constraint(equalTo: toastView.topAnchor, constant: ChatTheme.s(10)),
            toastLabel.bottomAnchor.constraint(equalTo: toastView.bottomAnchor, constant: -ChatTheme.s(10)),
            toastLabel.leadingAnchor.constraint(equalTo: toastView.leadingAnchor, constant: ChatTheme.s(16)),
            toastLabel.trailingAnchor.constraint(equalTo: toastView.trailingAnchor, constant: -ChatTheme.s(16)),

            loadingOverlay.topAnchor.constraint(equalTo: view.topAnchor),
            loadingOverlay.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            loadingOverlay.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            loadingOverlay.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            loadingIndicator.centerXAnchor.constraint(equalTo: loadingOverlay.centerXAnchor),
            loadingIndicator.centerYAnchor.constraint(equalTo: loadingOverlay.centerYAnchor),
        ])

        tableView.delegate = self
        tableView.dataSource = self
        tableView.showsVerticalScrollIndicator = false
        tableView.contentInset = UIEdgeInsets(top: 0, left: ChatTheme.s(6), bottom: 0, right: ChatTheme.s(6))
        tableView.register(MessageItemCell.self, forCellReuseIdentifier: MessageItemCell.id)
        tableView.register(DateBannerCell.self, forCellReuseIdentifier: DateBannerCell.id)
        inputContainerView.setBottomPadding(max(view.safeAreaInsets.bottom, ChatTheme.s(12)))
        inputContainerView.setPlaceholder("댓글을 입력하세요")
    }

    private func setupHeader() {
        headerView.configure(title: opponentName, onBack: { [weak self] in
            self?.closeToMessageRoot()
        })
    }

    private func closeToMessageRoot() {
        if let nav = navigationController, nav.presentingViewController != nil {
            nav.dismiss(animated: true)
            return
        }
        if presentingViewController != nil {
            dismiss(animated: true)
            return
        }
        navigationController?.popViewController(animated: true)
    }

    private func setupKeyboard() {
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillShow(_:)), name: UIResponder.keyboardWillShowNotification, object: nil)
        NotificationCenter.default.addObserver(self, selector: #selector(keyboardWillHide(_:)), name: UIResponder.keyboardWillHideNotification, object: nil)
    }

    private func setupKeyboardDismissTap() {
        view.addGestureRecognizer(keyboardDismissTap)
    }

    @objc private func handleBackgroundTapToDismissKeyboard() {
        view.endEditing(true)
    }

    @objc private func keyboardWillShow(_ n: Notification) {
        guard
            let frame = n.userInfo?[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect,
            let duration = n.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double
        else { return }
        inputBottomConstraint.constant = -(frame.height - view.safeAreaInsets.bottom)
        inputContainerView.setBottomPadding(0)
        UIView.animate(withDuration: duration) { self.view.layoutIfNeeded() }
    }

    @objc private func keyboardWillHide(_ n: Notification) {
        guard let duration = n.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double else { return }
        inputBottomConstraint.constant = 0
        inputContainerView.setBottomPadding(max(view.safeAreaInsets.bottom, ChatTheme.s(12)))
        UIView.animate(withDuration: duration) { self.view.layoutIfNeeded() }
    }

    private func setupSocket() {
        guard let roomId = room?.id else { return }
        ChatSocketManager.shared.delegate = self
        ChatSocketManager.shared.joinRoom(roomId: roomId)
        if ChatSocketManager.shared.isConnected {
            startPolling(interval: 5.0)
        } else {
            startPolling(interval: 1.5)
        }
    }

    private func fetchMessages() {
        guard let roomId = room?.id, !isLoading else { return }
        isLoading = true
        setLoadingOverlayVisible(true)
        if let cached = ChatMessageCache.shared.load(roomId: roomId) {
            messages = cached
            tableView.reloadData()
        }
        Task {
            do {
                let res = chatType == "dm"
                    ? try await ChatAPIService.shared.fetchDMRoomDetail(roomId: roomId)
                    : try await ChatAPIService.shared.fetchMessageRoomDetail(roomId: roomId)
                await MainActor.run {
                    self.messages = res.messages.reversed()
                    self.hasMore = res.hasMore
                    self.isLoading = false
                    ChatMessageCache.shared.save(messages: self.messages, roomId: roomId)
                    self.tableView.reloadData()
                    self.setLoadingOverlayVisible(false)
                }
            } catch {
                await MainActor.run {
                    self.isLoading = false
                    self.setLoadingOverlayVisible(false)
                }
            }
        }
    }

    private func fetchPostCard() {
        guard let roomId = room?.id else { return }
        postCardHeightConstraint.constant = PostCardView.preferredHeight
        postCardView.showSkeleton()
        Task {
            do {
                let res = try await ChatAPIService.shared.fetchMessageRoomForPost(roomId: roomId)
                guard let roomData = res.room else {
                    await MainActor.run { self.hidePostCard() }
                    return
                }
                let post = PostCardData(
                    id: roomData.postId,
                    author: "익명",
                    location: "",
                    content: roomData.postContent ?? "",
                    likes: 0,
                    comments: 0,
                    isLiked: false,
                    thumbnail: roomData.postThumbnail ?? ""
                )
                var enrichedPost = post
                if let postId = roomData.postId {
                    if let detail = try? await ChatAPIService.shared.fetchPostDetail(postId: postId).data {
                        enrichedPost = PostCardData(
                            id: post.id,
                            author: post.author,
                            location: post.location,
                            content: post.content,
                            likes: detail.likeCount ?? 0,
                            comments: detail.commentCount ?? 0,
                            isLiked: detail.isLiked ?? false,
                            thumbnail: (detail.thumbnail?.isEmpty == false) ? (detail.thumbnail ?? "") : post.thumbnail
                        )
                    }
                }
                await MainActor.run {
                    self.postCardView.configure(with: enrichedPost, onPress: { [weak self] in
                        self?.navigateToBoardDetail(post: enrichedPost)
                    })
                    self.postCardHeightConstraint.constant = PostCardView.preferredHeight
                    UIView.animate(withDuration: 0.2) { self.view.layoutIfNeeded() }
                }
            } catch {
                await MainActor.run { self.hidePostCard() }
            }
        }
    }

    private func hidePostCard() {
        postCardHeightConstraint.constant = 0
        postCardView.isHidden = true
        UIView.animate(withDuration: 0.2) { self.view.layoutIfNeeded() }
    }

    private func navigateToBoardDetail(post: PostCardData) {
        guard let postId = post.id, let url = URL(string: "cucumber://board/\(postId)") else { return }
        UIApplication.shared.open(url, options: [:]) { [weak self] success in
            if !success { self?.showToast("게시글 이동에 실패했습니다") }
        }
    }

    private func sendMessage(content: String, images: [UploadImagePayload] = []) {
        guard let roomId = room?.id else { return }
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty || !images.isEmpty else { return }
        print("[NativeChat][Send] tap timestamp=\(Date().timeIntervalSince1970) room_id=\(roomId)")
        let parentId = replyToMessage.flatMap { Int($0.id) }
        clearReplyTarget()
        Task {
            do {
                if chatType == "dm" {
                    try await ChatAPIService.shared.sendDMMessage(roomId: roomId, content: trimmed, parentMessageId: parentId, images: images)
                } else {
                    try await ChatAPIService.shared.sendMessage(roomId: roomId, content: trimmed, parentMessageId: parentId, images: images)
                }
                await MainActor.run {
                    self.pendingImages.removeAll()
                    self.inputContainerView.setAttachmentCount(0)
                }
            } catch {
                showToast("전송에 실패했습니다")
            }
        }
    }

    func setReplyTarget(_ message: ChatMessage) {
        replyToMessage = message
        replyPreviewTitleLabel.text = message.isMe ? "내 메시지에 답장 중" : "상대방에게 답장 중"
        replyPreviewContentLabel.text = message.content ?? "(이미지 메시지)"
        replyPreviewView.isHidden = false
    }

    @objc private func clearReplyTarget() {
        replyToMessage = nil
        replyPreviewView.isHidden = true
    }

    func showToast(_ text: String) {
        toastLabel.text = text
        toastView.isHidden = false
        UIView.animate(withDuration: 0.2, animations: { self.toastView.alpha = 1 }) { _ in
            UIView.animate(withDuration: 0.3, delay: 2.0, options: [], animations: {
                self.toastView.alpha = 0
            }) { _ in
                self.toastView.isHidden = true
            }
        }
    }

    private func setLoadingOverlayVisible(_ visible: Bool) {
        if visible {
            loadingOverlay.isHidden = false
            loadingIndicator.startAnimating()
            UIView.animate(withDuration: 0.15) { self.loadingOverlay.alpha = 1 }
        } else {
            UIView.animate(withDuration: 0.15, animations: { self.loadingOverlay.alpha = 0 }) { _ in
                self.loadingIndicator.stopAnimating()
                self.loadingOverlay.isHidden = true
            }
        }
    }

    private func startPolling(interval: TimeInterval) {
        if pollingInterval == interval, pollingTimer != nil { return }
        pollingInterval = interval
        stopPolling()
        pollingTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: true) { [weak self] _ in
            self?.pollLatestMessages()
        }
        print("[NativeChat][Poll] start interval=\(interval)s")
    }

    private func stopPolling() {
        pollingTimer?.invalidate()
        pollingTimer = nil
    }

    private func pollLatestMessages() {
        guard let roomId = room?.id else { return }
        let lastMessageId = messages.first(where: { $0.type != "dateBanner" })?.id
        guard let lastMessageId, !lastMessageId.isEmpty else { return }
        Task {
            do {
                let incoming: [ChatMessage]
                if chatType == "dm" {
                    incoming = try await ChatAPIService.shared.fetchNewDMRoomMessages(roomId: roomId, afterMessageId: lastMessageId, limit: 20)
                } else {
                    incoming = try await ChatAPIService.shared.fetchNewMessageRoomMessages(roomId: roomId, afterMessageId: lastMessageId, limit: 20)
                }
                guard !incoming.isEmpty else { return }
                await MainActor.run {
                    let existing = Set(self.messages.map(\.id))
                    let merged = incoming.filter { !existing.contains($0.id) }.reversed()
                    guard !merged.isEmpty else { return }
                    self.messages.insert(contentsOf: merged, at: 0)
                    self.tableView.reloadData()
                    print("[NativeChat][Poll] merged \(merged.count) new messages after=\(lastMessageId)")
                }
            } catch {
                print("[NativeChat][Poll] failed after=\(lastMessageId) error=\(error)")
            }
        }
    }
}

extension ChatRoomViewController: UITableViewDelegate, UITableViewDataSource {
    func tableView(_ tableView: UITableView, numberOfRowsInSection section: Int) -> Int {
        messages.count
    }

    func tableView(_ tableView: UITableView, cellForRowAt indexPath: IndexPath) -> UITableViewCell {
        let msg = messages[indexPath.row]
        if msg.type == "dateBanner" {
            let cell = tableView.dequeueReusableCell(withIdentifier: DateBannerCell.id, for: indexPath) as! DateBannerCell
            cell.configure(dateKey: msg.dateKey ?? "")
            cell.transform = CGAffineTransform(scaleX: 1, y: -1)
            return cell
        }
        let cell = tableView.dequeueReusableCell(withIdentifier: MessageItemCell.id, for: indexPath) as! MessageItemCell
        cell.configure(with: msg, opponentName: opponentName)
        cell.transform = CGAffineTransform(scaleX: 1, y: -1)
        cell.onReplyTargetPress = { [weak self] parentId in
            guard let self else { return }
            guard let idx = self.messages.firstIndex(where: { Int($0.id) == parentId }) else {
                self.showToast("상단으로 더 올려서 과거 메시지를 확인해 주세요")
                return
            }
            tableView.scrollToRow(at: IndexPath(row: idx, section: 0), at: .middle, animated: true)
        }
        return cell
    }

    func scrollViewDidScroll(_ scrollView: UIScrollView) {
        let offset = scrollView.contentOffset.y
        let threshold = scrollView.contentSize.height - scrollView.frame.height - 300
        if offset > threshold, hasMore, !isLoadingMore {
            loadMore()
        }
    }

    private func loadMore() {
        guard let roomId = room?.id, !isLoadingMore, hasMore else { return }
        isLoadingMore = true
        Task {
            do {
                let res = chatType == "dm"
                    ? try await ChatAPIService.shared.fetchDMRoomDetail(roomId: roomId)
                    : try await ChatAPIService.shared.fetchMessageRoomDetail(roomId: roomId)
                await MainActor.run {
                    self.messages.append(contentsOf: res.messages.reversed())
                    self.hasMore = res.hasMore
                    self.isLoadingMore = false
                    self.tableView.reloadData()
                }
            } catch {
                await MainActor.run { self.isLoadingMore = false }
            }
        }
    }
}

extension ChatRoomViewController: ChatSocketDelegate {
    func didReceiveNewMessage(_ message: ChatMessage, roomId: Int) {
        guard roomId == room?.id else { return }
        print("[NativeChat][Socket] new_message UI insert room_id=\(roomId) message_id=\(message.id)")
        DispatchQueue.main.async {
            self.messages.insert(message, at: 0)
            self.tableView.insertRows(at: [IndexPath(row: 0, section: 0)], with: .automatic)
        }
    }
    func didReceiveReadReceipt(_ receipt: SocketReadReceipt) {
        guard receipt.roomId == room?.id else { return }
        fetchMessages()
    }
    func didReceiveTyping(userId: Int, isTyping: Bool) {
        if isTyping { showToast("상대방이 입력 중입니다") }
    }
    func didConnect() {
        startPolling(interval: 5.0)
    }
    func didDisconnect() {
        startPolling(interval: 1.5)
    }
}

extension ChatRoomViewController: UIGestureRecognizerDelegate {
    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer, shouldReceive touch: UITouch) -> Bool {
        let location = touch.location(in: view)

        // 입력창/답장 프리뷰 터치는 기존 동작 유지
        if inputContainerView.frame.contains(location) || replyPreviewView.frame.contains(location) {
            return false
        }
        return true
    }
}

extension ChatRoomViewController: MessageInputViewDelegate {
    func didTapSend(content: String, replyTo: ChatMessage?) {
        sendMessage(content: content, images: pendingImages)
    }

    func didTapImageAttach() {
        var config = PHPickerConfiguration(photoLibrary: .shared())
        config.filter = .images
        config.selectionLimit = 10
        config.preferredAssetRepresentationMode = .current
        let picker = PHPickerViewController(configuration: config)
        picker.delegate = self
        present(picker, animated: true)
    }

    func didBeginTyping() { ChatSocketManager.shared.sendTypingStart() }
    func didEndTyping() { ChatSocketManager.shared.sendTypingStop() }
}

extension ChatRoomViewController: PHPickerViewControllerDelegate {
    func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
        picker.dismiss(animated: true)
        guard !results.isEmpty else { return }
        let providers = results.map(\.itemProvider)
        let group = DispatchGroup()
        let lock = NSLock()
        var loaded: [UploadImagePayload] = []
        for provider in providers where provider.canLoadObject(ofClass: UIImage.self) {
            group.enter()
            provider.loadObject(ofClass: UIImage.self) { object, _ in
                defer { group.leave() }
                guard let image = object as? UIImage, let data = image.jpegData(compressionQuality: 0.85) else { return }
                let payload = UploadImagePayload(
                    data: data,
                    fileName: "image_\(UUID().uuidString).jpg",
                    mimeType: "image/jpeg"
                )
                lock.lock()
                loaded.append(payload)
                lock.unlock()
            }
        }
        group.notify(queue: .main) {
            guard !loaded.isEmpty else {
                self.showToast("이미지 첨부에 실패했습니다")
                return
            }
            self.pendingImages.append(contentsOf: loaded)
            self.inputContainerView.setAttachmentCount(self.pendingImages.count)
            self.showToast("\(loaded.count)장의 이미지를 첨부했습니다")
        }
    }
}
