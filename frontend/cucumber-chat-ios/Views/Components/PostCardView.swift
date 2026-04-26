import UIKit

// MARK: - PostCardView (PostCard.jsx 1:1 대응)
class PostCardView: UIView {
    static var preferredHeight: CGFloat { ChatTheme.s(100) + ChatTheme.s(10) }

    private var onPress: (() -> Void)?

    // MARK: - UI (PostCard.jsx 레이아웃 기준)
    private let containerButton: UIButton = {
        let b = UIButton(type: .custom)
        b.translatesAutoresizingMaskIntoConstraints = false
        b.backgroundColor = ChatTheme.Color.background
        b.layer.cornerRadius = ChatTheme.s(10)
        b.layer.shadowColor = UIColor.black.cgColor
        b.layer.shadowOpacity = 0.06
        b.layer.shadowRadius = ChatTheme.s(6)
        b.layer.shadowOffset = CGSize(width: 0, height: ChatTheme.s(1))
        return b
    }()

    // 좌측 텍스트 영역
    private let authorLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.s(11))
        l.textColor = ChatTheme.Color.textSecondary
        l.numberOfLines = 1
        return l
    }()

    // 좋아요/댓글 (아이콘 + 숫자)
    private let statsRow: UIStackView = {
        let s = UIStackView()
        s.translatesAutoresizingMaskIntoConstraints = false
        s.axis = .horizontal
        s.alignment = .center
        s.spacing = ChatTheme.s(3)
        return s
    }()
    private let likeIconView: UIImageView = {
        let iv = UIImageView(image: UIImage(systemName: "heart"))
        iv.translatesAutoresizingMaskIntoConstraints = false
        iv.tintColor = ChatTheme.Color.alert
        iv.contentMode = .scaleAspectFit
        return iv
    }()
    private let likeCountLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.s(11))
        l.textColor = ChatTheme.Color.textSecondary
        return l
    }()
    private let commentIconView: UIImageView = {
        let iv = UIImageView(image: UIImage(systemName: "message"))
        iv.translatesAutoresizingMaskIntoConstraints = false
        iv.tintColor = ChatTheme.Color.primary
        iv.contentMode = .scaleAspectFit
        return iv
    }()
    private let commentCountLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.s(11))
        l.textColor = ChatTheme.Color.textSecondary
        return l
    }()

    // 게시글 내용 (하단 한 줄)
    private let contentLabel: UILabel = {
        let l = UILabel()
        l.translatesAutoresizingMaskIntoConstraints = false
        l.font = ChatTheme.Font.regular(size: ChatTheme.s(13))
        l.textColor = ChatTheme.Color.textPrimary
        l.numberOfLines = 1
        return l
    }()

    // 썸네일 (우측 56x56)
    private let thumbnailView: UIImageView = {
        let iv = UIImageView()
        iv.translatesAutoresizingMaskIntoConstraints = false
        iv.contentMode = .scaleAspectFill
        iv.clipsToBounds = true
        iv.layer.cornerRadius = ChatTheme.s(8)
        iv.backgroundColor = ChatTheme.Color.textLight10
        iv.isHidden = true
        return iv
    }()

    // 스켈레톤
    private let skeletonView: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.background
        v.layer.cornerRadius = ChatTheme.s(10)
        v.isHidden = true
        return v
    }()

    private let skeletonBar1: UIView = makeSkeletonBar()
    private let skeletonBar2: UIView = makeSkeletonBar()
    private let skeletonBar3: UIView = makeSkeletonBar()
    private let skeletonThumb: UIView = {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.textLight10
        v.layer.cornerRadius = ChatTheme.s(8)
        return v
    }()

    private static func makeSkeletonBar() -> UIView {
        let v = UIView()
        v.translatesAutoresizingMaskIntoConstraints = false
        v.backgroundColor = ChatTheme.Color.textLight10
        v.layer.cornerRadius = ChatTheme.s(4)
        return v
    }

    // MARK: - Init
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupUI()
    }
    required init?(coder: NSCoder) { fatalError() }

    // MARK: - Setup
    private func setupUI() {
        backgroundColor = .clear

        // 스켈레톤
        skeletonView.addSubview(skeletonBar1)
        skeletonView.addSubview(skeletonBar2)
        skeletonView.addSubview(skeletonBar3)
        skeletonView.addSubview(skeletonThumb)
        addSubview(skeletonView)

        // 실제 카드
        statsRow.addArrangedSubview(likeIconView)
        statsRow.addArrangedSubview(likeCountLabel)
        let spacer = UIView()
        spacer.translatesAutoresizingMaskIntoConstraints = false
        spacer.widthAnchor.constraint(equalToConstant: ChatTheme.s(10)).isActive = true
        statsRow.addArrangedSubview(spacer)
        statsRow.addArrangedSubview(commentIconView)
        statsRow.addArrangedSubview(commentCountLabel)
        containerButton.addSubview(authorLabel)
        containerButton.addSubview(statsRow)
        containerButton.addSubview(thumbnailView)
        containerButton.addSubview(contentLabel)
        addSubview(containerButton)

        NSLayoutConstraint.activate([
            // 카드 전체
            containerButton.topAnchor.constraint(equalTo: topAnchor, constant: ChatTheme.s(6)),
            containerButton.leadingAnchor.constraint(equalTo: leadingAnchor, constant: ChatTheme.s(12)),
            containerButton.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -ChatTheme.s(12)),
            containerButton.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -ChatTheme.s(4)),

            // 썸네일 (우측 56x56)
            thumbnailView.trailingAnchor.constraint(equalTo: containerButton.trailingAnchor, constant: -ChatTheme.s(12)),
            thumbnailView.topAnchor.constraint(equalTo: containerButton.topAnchor, constant: ChatTheme.s(8)),
            thumbnailView.widthAnchor.constraint(equalToConstant: ChatTheme.s(56)),
            thumbnailView.heightAnchor.constraint(equalToConstant: ChatTheme.s(56)),

            // 작성자 (좌측 상단)
            authorLabel.topAnchor.constraint(equalTo: containerButton.topAnchor, constant: ChatTheme.s(8)),
            authorLabel.leadingAnchor.constraint(equalTo: containerButton.leadingAnchor, constant: ChatTheme.s(12)),
            authorLabel.trailingAnchor.constraint(equalTo: statsRow.leadingAnchor, constant: -ChatTheme.s(8)),

            // 좋아요/댓글 (우측 상단, 썸네일 왼쪽)
            statsRow.trailingAnchor.constraint(equalTo: thumbnailView.leadingAnchor, constant: -ChatTheme.s(8)),
            statsRow.centerYAnchor.constraint(equalTo: authorLabel.centerYAnchor),

            // 내용 (하단)
            contentLabel.topAnchor.constraint(equalTo: authorLabel.bottomAnchor, constant: ChatTheme.s(5)),
            contentLabel.leadingAnchor.constraint(equalTo: containerButton.leadingAnchor, constant: ChatTheme.s(12)),
            contentLabel.trailingAnchor.constraint(equalTo: thumbnailView.leadingAnchor, constant: -ChatTheme.s(8)),
            contentLabel.bottomAnchor.constraint(equalTo: containerButton.bottomAnchor, constant: -ChatTheme.s(8)),

            likeIconView.widthAnchor.constraint(equalToConstant: ChatTheme.s(12)),
            likeIconView.heightAnchor.constraint(equalToConstant: ChatTheme.s(12)),
            commentIconView.widthAnchor.constraint(equalToConstant: ChatTheme.s(13)),
            commentIconView.heightAnchor.constraint(equalToConstant: ChatTheme.s(13)),

            // 스켈레톤
            skeletonView.topAnchor.constraint(equalTo: topAnchor, constant: ChatTheme.s(6)),
            skeletonView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: ChatTheme.s(12)),
            skeletonView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -ChatTheme.s(12)),
            skeletonView.bottomAnchor.constraint(equalTo: bottomAnchor, constant: -ChatTheme.s(4)),

            skeletonBar1.topAnchor.constraint(equalTo: skeletonView.topAnchor, constant: ChatTheme.s(12)),
            skeletonBar1.leadingAnchor.constraint(equalTo: skeletonView.leadingAnchor, constant: ChatTheme.s(12)),
            skeletonBar1.widthAnchor.constraint(equalTo: skeletonView.widthAnchor, multiplier: 0.45),
            skeletonBar1.heightAnchor.constraint(equalToConstant: ChatTheme.s(10)),

            skeletonBar2.topAnchor.constraint(equalTo: skeletonBar1.bottomAnchor, constant: ChatTheme.s(8)),
            skeletonBar2.leadingAnchor.constraint(equalTo: skeletonView.leadingAnchor, constant: ChatTheme.s(12)),
            skeletonBar2.widthAnchor.constraint(equalTo: skeletonView.widthAnchor, multiplier: 0.3),
            skeletonBar2.heightAnchor.constraint(equalToConstant: ChatTheme.s(8)),

            skeletonBar3.topAnchor.constraint(equalTo: skeletonBar2.bottomAnchor, constant: ChatTheme.s(8)),
            skeletonBar3.leadingAnchor.constraint(equalTo: skeletonView.leadingAnchor, constant: ChatTheme.s(12)),
            skeletonBar3.trailingAnchor.constraint(equalTo: skeletonThumb.leadingAnchor, constant: -ChatTheme.s(8)),
            skeletonBar3.heightAnchor.constraint(equalToConstant: ChatTheme.s(12)),

            skeletonThumb.trailingAnchor.constraint(equalTo: skeletonView.trailingAnchor, constant: -ChatTheme.s(12)),
            skeletonThumb.topAnchor.constraint(equalTo: skeletonView.topAnchor, constant: ChatTheme.s(8)),
            skeletonThumb.widthAnchor.constraint(equalToConstant: ChatTheme.s(56)),
            skeletonThumb.heightAnchor.constraint(equalToConstant: ChatTheme.s(56)),
        ])

        containerButton.addTarget(self, action: #selector(tappedCard), for: .touchUpInside)
    }

    // MARK: - Configure (PostCard.jsx setPost 대응)
    func configure(with post: PostCardData, onPress: (() -> Void)?) {
        self.onPress = onPress
        skeletonView.isHidden = true
        containerButton.isHidden = false

        authorLabel.text = post.author + (post.location.isEmpty ? "" : " · \(post.location)")
        contentLabel.text = post.content
        likeIconView.image = UIImage(systemName: post.isLiked ? "heart.fill" : "heart")
        likeCountLabel.text = "\(post.likes)"
        commentCountLabel.text = "\(post.comments)"

        if !post.thumbnail.isEmpty, let url = URL(string: post.thumbnail) {
            thumbnailView.isHidden = false
            URLSession.shared.dataTask(with: url) { data, _, _ in
                if let data = data, let img = UIImage(data: data) {
                    DispatchQueue.main.async { self.thumbnailView.image = img }
                }
            }.resume()
        } else {
            thumbnailView.isHidden = true
        }
    }

    // MARK: - Skeleton (PostCardSkeleton 대응)
    func showSkeleton() {
        skeletonView.isHidden = false
        containerButton.isHidden = true
    }

    @objc private func tappedCard() { onPress?() }
}
