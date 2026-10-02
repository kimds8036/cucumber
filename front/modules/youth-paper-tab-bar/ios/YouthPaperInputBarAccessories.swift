import ExpoModulesCore
import ImageIO
import UIKit

// MARK: - 답글 줄

struct InputBarReply: Record {
  @Field var title: String = ""
  /// 채팅 답장처럼 두 줄로 보일 때 아래 줄. 없으면 한 줄.
  @Field var subtitle: String?
}

struct InputBarReplyStyle: Record {
  @Field var titleColor: UIColor = .systemGreen
  @Field var titleFontSize: Double = 12
  @Field var titleBold: Bool = false
  @Field var subtitleColor: UIColor = .secondaryLabel
  @Field var subtitleFontSize: Double = 12
  @Field var cancelColor: UIColor = .tertiaryLabel
}

final class InputBarReplyRow: UIView {
  var onCancel: (() -> Void)?

  private let titleLabel = UILabel()
  private let subtitleLabel = UILabel()
  private let cancelButton = UIButton(type: .system)

  /// `glass`면 콘텐츠가 뒤로 비쳐도 글이 읽히도록 답글 줄을 유리 카드에 담는다.
  init(horizontalPadding: CGFloat, glass: Bool) {
    super.init(frame: .zero)

    let container: UIView
    let textInset: CGFloat
    if glass {
      let (card, content) = makeInputBarSurface(cornerRadius: 18, interactive: false)
      card.translatesAutoresizingMaskIntoConstraints = false
      addSubview(card)
      NSLayoutConstraint.activate([
        card.topAnchor.constraint(equalTo: topAnchor, constant: 8),
        card.bottomAnchor.constraint(equalTo: bottomAnchor),
        card.leadingAnchor.constraint(equalTo: leadingAnchor, constant: horizontalPadding),
        card.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -horizontalPadding),
      ])
      container = content
      textInset = 14
    } else {
      container = self
      textInset = horizontalPadding + 4
    }

    titleLabel.numberOfLines = 1
    subtitleLabel.numberOfLines = 1

    let labels = UIStackView(arrangedSubviews: [titleLabel, subtitleLabel])
    labels.axis = .vertical
    labels.spacing = 2

    cancelButton.setImage(
      UIImage(systemName: "xmark.circle.fill", withConfiguration: UIImage.SymbolConfiguration(pointSize: 18)),
      for: .normal
    )
    cancelButton.addTarget(self, action: #selector(handleCancel), for: .touchUpInside)

    for view in [labels, cancelButton] {
      view.translatesAutoresizingMaskIntoConstraints = false
      container.addSubview(view)
    }

    NSLayoutConstraint.activate([
      labels.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: textInset),
      labels.topAnchor.constraint(equalTo: container.topAnchor, constant: 8),
      labels.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: glass ? -8 : -4),
      labels.trailingAnchor.constraint(lessThanOrEqualTo: cancelButton.leadingAnchor, constant: -8),

      cancelButton.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: glass ? -6 : -(horizontalPadding - 8)),
      cancelButton.centerYAnchor.constraint(equalTo: labels.centerYAnchor),
      cancelButton.widthAnchor.constraint(equalToConstant: 34),
      cancelButton.heightAnchor.constraint(equalToConstant: 34),
    ])
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  func apply(reply: InputBarReply, style: InputBarReplyStyle) {
    titleLabel.text = reply.title
    titleLabel.textColor = style.titleColor
    titleLabel.font = .systemFont(
      ofSize: CGFloat(style.titleFontSize),
      weight: style.titleBold ? .semibold : .regular
    )

    let subtitle = reply.subtitle ?? ""
    subtitleLabel.text = subtitle
    subtitleLabel.isHidden = subtitle.isEmpty
    subtitleLabel.textColor = style.subtitleColor
    subtitleLabel.font = .systemFont(ofSize: CGFloat(style.subtitleFontSize))

    cancelButton.tintColor = style.cancelColor
  }

  @objc private func handleCancel() {
    onCancel?()
  }
}

// MARK: - 이미지 미리보기

private let thumbnailSize: CGFloat = 72
private let thumbnailSpacing: CGFloat = 8
private let removeButtonSize: CGFloat = 22
// 지우기 버튼이 썸네일 오른쪽 위로 삐져나오는 만큼 위·오른쪽에 여유를 둔다.
private let removeButtonOverhang: CGFloat = 6

private let thumbnailCache: NSCache<NSString, UIImage> = {
  let cache = NSCache<NSString, UIImage>()
  cache.countLimit = 30
  return cache
}()

private let thumbnailQueue = DispatchQueue(label: "YouthPaperInputBar.thumbnail", qos: .userInitiated)

/// 원본 사진을 통째로 읽지 않고 썸네일 크기로 줄여 읽는다.
private func loadThumbnail(uri: String, pixelSize: CGFloat, completion: @escaping (UIImage?) -> Void) {
  if let cached = thumbnailCache.object(forKey: uri as NSString) {
    completion(cached)
    return
  }
  thumbnailQueue.async {
    var image: UIImage?
    if let url = URL(string: uri),
       let source = CGImageSourceCreateWithURL(url as CFURL, nil) {
      let options: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: pixelSize,
      ]
      if let cgImage = CGImageSourceCreateThumbnailAtIndex(source, 0, options as CFDictionary) {
        image = UIImage(cgImage: cgImage)
      }
    }
    if let image {
      thumbnailCache.setObject(image, forKey: uri as NSString)
    }
    DispatchQueue.main.async { completion(image) }
  }
}

final class InputBarImageStrip: UIView {
  var onRemove: ((Int) -> Void)?

  private let scrollView = UIScrollView()
  private let itemsStack = UIStackView()
  private var uris: [String] = []

  init(horizontalPadding: CGFloat) {
    super.init(frame: .zero)

    scrollView.showsHorizontalScrollIndicator = false
    scrollView.alwaysBounceHorizontal = true
    scrollView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(scrollView)

    itemsStack.axis = .horizontal
    itemsStack.spacing = thumbnailSpacing
    itemsStack.alignment = .bottom
    itemsStack.translatesAutoresizingMaskIntoConstraints = false
    scrollView.addSubview(itemsStack)

    let content = scrollView.contentLayoutGuide
    NSLayoutConstraint.activate([
      scrollView.topAnchor.constraint(equalTo: topAnchor),
      scrollView.leadingAnchor.constraint(equalTo: leadingAnchor),
      scrollView.trailingAnchor.constraint(equalTo: trailingAnchor),
      scrollView.bottomAnchor.constraint(equalTo: bottomAnchor),
      scrollView.heightAnchor.constraint(equalToConstant: thumbnailSize + removeButtonOverhang + 8),

      itemsStack.leadingAnchor.constraint(equalTo: content.leadingAnchor, constant: horizontalPadding),
      itemsStack.trailingAnchor.constraint(equalTo: content.trailingAnchor, constant: -horizontalPadding),
      itemsStack.topAnchor.constraint(equalTo: content.topAnchor, constant: removeButtonOverhang + 8),
      itemsStack.bottomAnchor.constraint(equalTo: content.bottomAnchor),
      itemsStack.heightAnchor.constraint(equalToConstant: thumbnailSize),
    ])
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) has not been implemented")
  }

  func setImages(_ newUris: [String]) {
    guard newUris != uris else { return }
    uris = newUris

    itemsStack.arrangedSubviews.forEach { $0.removeFromSuperview() }
    let pixelSize = thumbnailSize * (window?.screen.scale ?? UIScreen.main.scale)
    for (index, uri) in newUris.enumerated() {
      itemsStack.addArrangedSubview(makeThumbnail(uri: uri, index: index, pixelSize: pixelSize))
    }
  }

  private func makeThumbnail(uri: String, index: Int, pixelSize: CGFloat) -> UIView {
    let container = UIView()
    container.translatesAutoresizingMaskIntoConstraints = false

    let imageView = UIImageView()
    imageView.contentMode = .scaleAspectFill
    imageView.clipsToBounds = true
    imageView.layer.cornerRadius = 8
    imageView.layer.cornerCurve = .continuous
    imageView.backgroundColor = .secondarySystemFill
    imageView.translatesAutoresizingMaskIntoConstraints = false
    container.addSubview(imageView)

    let removeButton = UIButton(type: .custom)
    removeButton.setImage(
      UIImage(
        systemName: "xmark.circle.fill",
        withConfiguration: UIImage.SymbolConfiguration(pointSize: 18)
          .applying(UIImage.SymbolConfiguration(paletteColors: [.white, .black]))
      ),
      for: .normal
    )
    removeButton.tag = index
    removeButton.addTarget(self, action: #selector(handleRemove(_:)), for: .touchUpInside)
    removeButton.translatesAutoresizingMaskIntoConstraints = false
    container.addSubview(removeButton)

    NSLayoutConstraint.activate([
      container.widthAnchor.constraint(equalToConstant: thumbnailSize),
      container.heightAnchor.constraint(equalToConstant: thumbnailSize),
      imageView.topAnchor.constraint(equalTo: container.topAnchor),
      imageView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
      imageView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
      imageView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
      removeButton.centerXAnchor.constraint(equalTo: container.trailingAnchor, constant: -removeButtonSize / 2 + removeButtonOverhang),
      removeButton.centerYAnchor.constraint(equalTo: container.topAnchor, constant: removeButtonSize / 2 - removeButtonOverhang),
      removeButton.widthAnchor.constraint(equalToConstant: removeButtonSize + 8),
      removeButton.heightAnchor.constraint(equalToConstant: removeButtonSize + 8),
    ])

    loadThumbnail(uri: uri, pixelSize: pixelSize) { [weak imageView] image in
      imageView?.image = image
    }
    return container
  }

  @objc private func handleRemove(_ sender: UIButton) {
    onRemove?(sender.tag)
  }
}
