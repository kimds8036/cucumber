import ExpoModulesCore

public class YouthPaperInputBarModule: Module {
  public func definition() -> ModuleDefinition {
    Name("YouthPaperInputBar")

    View(YouthPaperInputBarView.self) {
      Events(
        "onChangeText",
        "onSend",
        "onPressAttach",
        "onHeightChange",
        "onInputFocus",
        "onInputBlur",
        "onCancelReply",
        "onRemoveImage"
      )

      Prop("reply") { (view: YouthPaperInputBarView, reply: InputBarReply?) in
        view.reply = reply
      }

      Prop("replyStyle") { (view: YouthPaperInputBarView, style: InputBarReplyStyle) in
        view.replyStyle = style
      }

      Prop("images") { (view: YouthPaperInputBarView, images: [String]) in
        view.images = images
      }

      Prop("text") { (view: YouthPaperInputBarView, text: String) in
        view.setPendingText(text)
      }

      Prop("mostRecentEventCount") { (view: YouthPaperInputBarView, count: Int) in
        view.setPendingEventCount(count)
      }

      Prop("placeholder") { (view: YouthPaperInputBarView, placeholder: String) in
        view.placeholder = placeholder
      }

      Prop("maxLength") { (view: YouthPaperInputBarView, maxLength: Int) in
        view.maxLength = maxLength
      }

      Prop("editable") { (view: YouthPaperInputBarView, editable: Bool) in
        view.isInputEditable = editable
      }

      Prop("showAttach") { (view: YouthPaperInputBarView, show: Bool) in
        view.showAttach = show
      }

      Prop("fontSize") { (view: YouthPaperInputBarView, size: Double) in
        view.fontSize = CGFloat(size)
      }

      Prop("textColor") { (view: YouthPaperInputBarView, color: UIColor) in
        view.textColor = color
      }

      Prop("placeholderColor") { (view: YouthPaperInputBarView, color: UIColor) in
        view.placeholderColor = color
      }

      Prop("inputBackgroundColor") { (view: YouthPaperInputBarView, color: UIColor) in
        view.inputBackgroundColor = color
      }

      Prop("barBackgroundColor") { (view: YouthPaperInputBarView, color: UIColor) in
        view.barBackgroundColor = color
      }

      Prop("barBorderColor") { (view: YouthPaperInputBarView, color: UIColor) in
        view.barBorderColor = color
      }

      Prop("sendButtonColor") { (view: YouthPaperInputBarView, color: UIColor) in
        view.sendButtonColor = color
      }

      Prop("sendIconColor") { (view: YouthPaperInputBarView, color: UIColor) in
        view.sendIconColor = color
      }

      Prop("attachIconColor") { (view: YouthPaperInputBarView, color: UIColor) in
        view.attachIconColor = color
      }

      OnViewDidUpdateProps { (view: YouthPaperInputBarView) in
        view.applyPendingText()
      }

      AsyncFunction("focus") { (view: YouthPaperInputBarView) in
        view.focusInput()
      }.runOnQueue(.main)

      AsyncFunction("blur") { (view: YouthPaperInputBarView) in
        view.blurInput()
      }.runOnQueue(.main)

      AsyncFunction("clear") { (view: YouthPaperInputBarView) in
        view.clearInput()
      }.runOnQueue(.main)
    }
  }
}
