import ExpoModulesCore
import UIKit

private let rowPaddingHorizontal: CGFloat = 16
private let rowPaddingVertical: CGFloat = 8
private let rowSpacing: CGFloat = 8
private let attachButtonSize: CGFloat = 44
private let capsuleMinHeight: CGFloat = 44
private let capsuleMaxHeight: CGFloat = 80
private let sendButtonSize: CGFloat = 32
// 한 줄일 때 전송 버튼이 캡슐 세로 가운데에 오게 한다.
private let sendButtonInset: CGFloat = (capsuleMinHeight - sendButtonSize) / 2
/// 캡슐 오른쪽 끝에서 전송 버튼 가운데까지. 답글 X 버튼을 전송 버튼과 세로로 맞춘다.
let capsuleSendButtonCenterInset: CGFloat = sendButtonInset + sendButtonSize / 2
private let textLeadingInset: CGFloat = 16

/// iOS 26 이상은 유리, 그 아래는 흰 입력줄 바탕과 회색 입력칸.
let inputBarUsesGlass: Bool = {
  if #available(iOS 26.0, *) { return true }
  return false
}()

/// 유리면 `UIVisualEffectView`, 아니면 그냥 `UIView`. 안에 넣을 뷰는 `content`에 붙인다.
func makeInputBarSurface(cornerRadius: CGFloat?, interactive: Bool) -> (surface: UIView, content: UIView) {
  if #available(iOS 26.0, *) {
    let effect = UIGlassEffect(style: .regular)
    effect.isInteractive = interactive
    let effectView = UIVisualEffectView(effect: effect)
    effectView.cornerConfiguration = cornerRadius.map { .corners(radius: .fixed($0)) } ?? .capsule()
    return (effectView, effectView.contentView)
  }
  let view = UIView()
  if let cornerRadius {
    view.layer.cornerRadius = cornerRadius
    view.layer.cornerCurve = .continuous
    view.clipsToBounds = true
  }
  return (view, view)
}

class YouthPaperInputBarView: ExpoView, UITextViewDelegate {
  let onChangeText = EventDispatcher()
  let onSend = EventDispatcher()
  let onPressAttach = EventDispatcher()
  let onHeightChange = EventDispatcher()
  let onInputFocus = EventDispatcher()
  let onInputBlur = EventDispatcher()
  let onCancelReply = EventDispatcher()
  let onRemoveImage = EventDispatcher()

  var reply: InputBarReply? { didSet { applyReply() } }
  var replyStyle = InputBarReplyStyle() { didSet { applyReply() } }
  var images: [String] = [] { didSet { applyImages() } }

  var maxLength = 0
  var isInputEditable = true
  var showAttach = true { didSet { updateAttachVisibility() } }
  var fontSize: CGFloat = 14 { didSet { applyFont() } }
  var placeholder = "" { didSet { placeholderLabel.text = placeholder } }

  var textColor: UIColor = .label { didSet { textView.textColor = textColor } }
  var placeholderColor: UIColor = .placeholderText { didSet { placeholderLabel.textColor = placeholderColor } }
  // 아래 세 색은 유리가 없는 iOS 26 미만에서만 쓴다.
  var inputBackgroundColor: UIColor = .secondarySystemBackground { didSet { applyFallbackColors() } }
  var barBackgroundColor: UIColor = .systemBackground { didSet { applyFallbackColors() } }
  var barBorderColor: UIColor = .separator { didSet { applyFallbackColors() } }
  var sendButtonColor: UIColor = .tintColor { didSet { sendButton.backgroundColor = sendButtonColor } }
  var sendIconColor: UIColor = .white { didSet { sendButton.tintColor = sendIconColor } }
  var attachIconColor: UIColor = .secondaryLabel { didSet { attachButton.tintColor = attachIconColor } }

  // JS가 늦게 돌려준 옛 글로 입력 중인 글을 덮어쓰지 않도록, 네이티브가 보낸 변경 횟수를 JS가 되돌려 준다.
  private var eventCount = 0
  private var pendingText: String?
  private var pendingEventCount = 0

  private let stackView = UIStackView()
  private let replyRow = InputBarReplyRow(textInset: textLeadingInset)
  private let imageStrip = InputBarImageStrip(horizontalPadding: rowPaddingHorizontal)
  private let inputRow = UIView()
  private let topBorder = UIView()
  private let attachButton = UIButton(type: .system)
  private let attachSurface: UIView
  private let attachContent: UIView
  private let capsuleView: UIView
  private let capsuleContent: UIView
  // 답글 줄과 글 입력줄을 캡슐 하나 안에 세로로 쌓는다.
  private let capsuleStack = UIStackView()
  private let textRow = UIView()
  private let textView = UITextView()
  private let placeholderLabel = UILabel()
  private let sendButton = UIButton(type: .system)

  private var textHeightConstraint: NSLayoutConstraint!
  private var capsuleLeadingToAttach: NSLayoutConstraint!
  private var capsuleLeadingToEdge: NSLayoutConstraint!
  private var reportedHeight: CGFloat = 0

  required init(appContext: AppContext? = nil) {
    (attachSurface, attachContent) = makeInputBarSurface(cornerRadius: nil, interactive: true)
    (capsuleView, capsuleContent) = makeInputBarSurface(cornerRadius: capsuleMinHeight / 2, interactive: false)
    super.init(appContext: appContext)
    setUpViews()
    applyFont()
    applyFallbackColors()
  }

  // MARK: - 구성

  private func setUpViews() {
    stackView.axis = .vertical
    stackView.translatesAutoresizingMaskIntoConstraints = false
    addSubview(stackView)
    stackView.addArrangedSubview(imageStrip)
    stackView.addArrangedSubview(inputRow)

    capsuleStack.axis = .vertical
    capsuleStack.addArrangedSubview(replyRow)
    capsuleStack.addArrangedSubview(textRow)

    replyRow.isHidden = true
    replyRow.onCancel = { [weak self] in self?.handleCancelReply() }
    imageStrip.isHidden = true
    imageStrip.onRemove = { [weak self] index in self?.handleRemoveImage(index) }

    attachButton.setImage(
      UIImage(systemName: "photo", withConfiguration: UIImage.SymbolConfiguration(pointSize: 14, weight: .regular)),
      for: .normal
    )
    attachButton.tintColor = attachIconColor
    attachButton.addTarget(self, action: #selector(handleAttach), for: .touchUpInside)


    textView.delegate = self
    textView.backgroundColor = .clear
    textView.textColor = textColor
    textView.textContainer.lineFragmentPadding = 0
    textView.showsVerticalScrollIndicator = false
    textView.isScrollEnabled = false

    placeholderLabel.textColor = placeholderColor
    placeholderLabel.numberOfLines = 1
    placeholderLabel.isUserInteractionEnabled = false

    sendButton.setImage(
      UIImage(systemName: "arrow.up", withConfiguration: UIImage.SymbolConfiguration(pointSize: 14.5, weight: .semibold)),
      for: .normal
    )
    sendButton.tintColor = sendIconColor
    sendButton.backgroundColor = sendButtonColor
    sendButton.layer.cornerRadius = sendButtonSize / 2
    sendButton.addTarget(self, action: #selector(handleSend), for: .touchUpInside)

    topBorder.isHidden = inputBarUsesGlass
    for view in [topBorder, attachSurface, attachButton, capsuleView, capsuleStack, textView, placeholderLabel, sendButton] {
      view.translatesAutoresizingMaskIntoConstraints = false
    }
    addSubview(topBorder)
    inputRow.addSubview(attachSurface)
    attachContent.addSubview(attachButton)
    inputRow.addSubview(capsuleView)
    capsuleContent.addSubview(capsuleStack)
    textRow.addSubview(textView)
    textRow.addSubview(placeholderLabel)
    textRow.addSubview(sendButton)

    textHeightConstraint = textView.heightAnchor.constraint(equalToConstant: capsuleMinHeight)
    capsuleLeadingToAttach = capsuleView.leadingAnchor.constraint(equalTo: attachSurface.trailingAnchor, constant: rowSpacing)
    capsuleLeadingToEdge = capsuleView.leadingAnchor.constraint(equalTo: inputRow.leadingAnchor, constant: rowPaddingHorizontal)

    NSLayoutConstraint.activate([
      // 높이는 JS가 onHeightChange로 받아 정하므로 아래쪽은 붙이지 않는다.
      stackView.topAnchor.constraint(equalTo: topAnchor),
      stackView.leadingAnchor.constraint(equalTo: leadingAnchor),
      stackView.trailingAnchor.constraint(equalTo: trailingAnchor),

      topBorder.topAnchor.constraint(equalTo: topAnchor),
      topBorder.leadingAnchor.constraint(equalTo: leadingAnchor),
      topBorder.trailingAnchor.constraint(equalTo: trailingAnchor),
      topBorder.heightAnchor.constraint(equalToConstant: 0.5),

      attachSurface.leadingAnchor.constraint(equalTo: inputRow.leadingAnchor, constant: rowPaddingHorizontal),
      attachSurface.bottomAnchor.constraint(equalTo: capsuleView.bottomAnchor),
      attachSurface.widthAnchor.constraint(equalToConstant: attachButtonSize),
      attachSurface.heightAnchor.constraint(equalToConstant: attachButtonSize),
      attachButton.topAnchor.constraint(equalTo: attachContent.topAnchor),
      attachButton.leadingAnchor.constraint(equalTo: attachContent.leadingAnchor),
      attachButton.trailingAnchor.constraint(equalTo: attachContent.trailingAnchor),
      attachButton.bottomAnchor.constraint(equalTo: attachContent.bottomAnchor),

      capsuleLeadingToAttach,
      capsuleView.trailingAnchor.constraint(equalTo: inputRow.trailingAnchor, constant: -rowPaddingHorizontal),
      capsuleView.topAnchor.constraint(equalTo: inputRow.topAnchor, constant: rowPaddingVertical),
      capsuleView.bottomAnchor.constraint(equalTo: inputRow.bottomAnchor, constant: -rowPaddingVertical),

      capsuleStack.topAnchor.constraint(equalTo: capsuleContent.topAnchor),
      capsuleStack.leadingAnchor.constraint(equalTo: capsuleContent.leadingAnchor),
      capsuleStack.trailingAnchor.constraint(equalTo: capsuleContent.trailingAnchor),
      capsuleStack.bottomAnchor.constraint(equalTo: capsuleContent.bottomAnchor),

      textView.topAnchor.constraint(equalTo: textRow.topAnchor),
      textView.bottomAnchor.constraint(equalTo: textRow.bottomAnchor),
      textView.leadingAnchor.constraint(equalTo: textRow.leadingAnchor, constant: textLeadingInset),
      textView.trailingAnchor.constraint(equalTo: sendButton.leadingAnchor, constant: -8),
      textHeightConstraint,

      placeholderLabel.leadingAnchor.constraint(equalTo: textView.leadingAnchor),
      placeholderLabel.trailingAnchor.constraint(equalTo: textView.trailingAnchor),
      placeholderLabel.centerYAnchor.constraint(equalTo: textView.topAnchor, constant: capsuleMinHeight / 2),

      sendButton.trailingAnchor.constraint(equalTo: textRow.trailingAnchor, constant: -sendButtonInset),
      sendButton.bottomAnchor.constraint(equalTo: textRow.bottomAnchor, constant: -sendButtonInset),
      sendButton.widthAnchor.constraint(equalToConstant: sendButtonSize),
      sendButton.heightAnchor.constraint(equalToConstant: sendButtonSize),
    ])
  }

  private func applyFont() {
    let font = UIFont.systemFont(ofSize: fontSize)
    textView.font = font
    placeholderLabel.font = font
    // 한 줄일 때 글이 캡슐 세로 가운데에 오게 한다.
    let vertical = max((capsuleMinHeight - font.lineHeight) / 2, 0)
    textView.textContainerInset = UIEdgeInsets(top: vertical, left: 0, bottom: vertical, right: 0)
    setNeedsLayout()
  }

  private func applyFallbackColors() {
    guard !inputBarUsesGlass else { return }
    backgroundColor = barBackgroundColor
    topBorder.backgroundColor = barBorderColor
    capsuleView.backgroundColor = inputBackgroundColor
  }

  private func updateAttachVisibility() {
    attachSurface.isHidden = !showAttach
    capsuleLeadingToAttach.isActive = showAttach
    capsuleLeadingToEdge.isActive = !showAttach
    setNeedsLayout()
  }

  private func applyReply() {
    let title = reply?.title ?? ""
    replyRow.isHidden = title.isEmpty
    if let reply, !title.isEmpty {
      replyRow.apply(reply: reply, style: replyStyle)
    }
    setNeedsLayout()
  }

  private func applyImages() {
    imageStrip.setImages(images)
    imageStrip.isHidden = images.isEmpty
    setNeedsLayout()
  }

  private func updatePlaceholder() {
    placeholderLabel.isHidden = !(textView.text ?? "").isEmpty
  }

  // MARK: - 높이

  override func layoutSubviews() {
    super.layoutSubviews()
    guard bounds.width > 0 else { return }

    if updateTextHeight() {
      super.layoutSubviews()
    }

    let height = stackView.systemLayoutSizeFitting(
      CGSize(width: bounds.width, height: 0),
      withHorizontalFittingPriority: .required,
      verticalFittingPriority: .fittingSizeLevel
    ).height
    if abs(height - reportedHeight) > 0.5 {
      reportedHeight = height
      onHeightChange(["height": height])
    }
  }

  /// 글 높이에 맞춰 입력칸 높이를 바꾼다. 최대 높이를 넘으면 안에서 스크롤한다. 바뀌었으면 true.
  private func updateTextHeight() -> Bool {
    let width = textView.bounds.width
    guard width > 0 else { return false }
    let fitting = textView.sizeThatFits(CGSize(width: width, height: .greatestFiniteMagnitude)).height
    let target = min(max(fitting, capsuleMinHeight), capsuleMaxHeight)
    textView.isScrollEnabled = fitting > capsuleMaxHeight
    guard abs(textHeightConstraint.constant - target) > 0.5 else { return false }
    textHeightConstraint.constant = target
    return true
  }

  // MARK: - 텍스트 동기화

  func setPendingText(_ text: String) {
    pendingText = text
  }

  func setPendingEventCount(_ count: Int) {
    pendingEventCount = count
  }

  func applyPendingText() {
    guard let text = pendingText else { return }
    pendingText = nil
    // 사용자가 그 사이 더 입력했거나 한글 조합 중이면 JS 값을 버린다. 다음 onChangeText가 JS를 따라잡게 한다.
    guard pendingEventCount >= eventCount, textView.markedTextRange == nil else { return }
    guard textView.text != text else { return }
    textView.text = text
    updatePlaceholder()
    setNeedsLayout()
  }

  private func emitChangeText() {
    eventCount += 1
    onChangeText(["text": textView.text ?? "", "eventCount": eventCount])
  }

  // MARK: - ref 메서드

  func focusInput() {
    textView.becomeFirstResponder()
  }

  func blurInput() {
    textView.resignFirstResponder()
  }

  func clearInput() {
    guard !(textView.text ?? "").isEmpty else { return }
    textView.text = ""
    updatePlaceholder()
    setNeedsLayout()
    emitChangeText()
  }

  // MARK: - 버튼

  @objc private func handleAttach() {
    guard isInputEditable else { return }
    onPressAttach()
  }

  @objc private func handleSend() {
    guard isInputEditable else { return }
    // 조합 중인 글자는 onChangeText로 이미 JS에 갔다. 조합만 끝내야 전송 뒤 비우기가 적용된다.
    if textView.markedTextRange != nil {
      textView.unmarkText()
    }
    let text = (textView.text ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
    guard !text.isEmpty || !images.isEmpty else { return }
    onSend()
  }

  private func handleCancelReply() {
    onCancelReply()
  }

  private func handleRemoveImage(_ index: Int) {
    guard isInputEditable, images.indices.contains(index) else { return }
    onRemoveImage(["index": index])
  }

  // MARK: - UITextViewDelegate

  func textView(_ textView: UITextView, shouldChangeTextIn range: NSRange, replacementText text: String) -> Bool {
    // editable=false로 키보드를 내리지 않고 전송 중 입력만 막는다.
    guard isInputEditable else { return false }
    guard maxLength > 0, !text.isEmpty else { return true }
    let current = (textView.text ?? "") as NSString
    return current.length - range.length + (text as NSString).length <= maxLength
  }

  func textViewDidChange(_ textView: UITextView) {
    updatePlaceholder()
    setNeedsLayout()
    emitChangeText()
  }

  func textViewDidBeginEditing(_ textView: UITextView) {
    onInputFocus()
  }

  func textViewDidEndEditing(_ textView: UITextView) {
    onInputBlur()
  }
}
