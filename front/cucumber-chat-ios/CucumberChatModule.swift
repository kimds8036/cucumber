import Foundation
import UIKit
import React

@objc(CucumberNativeChat)
class CucumberChatModule: NSObject {

  @objc static func requiresMainQueueSetup() -> Bool { true }

  @objc func open(_ options: NSDictionary,
                  resolve: @escaping RCTPromiseResolveBlock,
                  reject: @escaping RCTPromiseRejectBlock) {
    guard
      let roomIdStr = options["roomId"] as? String,
      let roomId = Int(roomIdStr),
      let token = options["accessToken"] as? String,
      let baseUrl = options["baseUrl"] as? String
    else {
      reject("INVALID_PARAMS", "roomId, accessToken, baseUrl 필수", nil)
      return
    }

    let title = options["title"] as? String ?? ""
    let chatChannel = options["chatChannel"] as? String ?? "messages"
    let mappedChatType = (chatChannel == "dm") ? "dm" : "room"

    DispatchQueue.main.async {
      let root = UIApplication.shared.connectedScenes
        .compactMap { $0 as? UIWindowScene }
        .flatMap { $0.windows }
        .first(where: { $0.isKeyWindow })?
        .rootViewController
      guard let root else {
        reject("NO_ROOT_VC", "rootViewController 없음", nil)
        return
      }

      let vc = ChatRoomViewController()
      vc.chatType = mappedChatType
      vc.opponentName = title.isEmpty ? (mappedChatType == "dm" ? "친구" : "쪽지") : title
      vc.room = ChatRoom(
        id: roomId,
        otherUserId: nil,
        otherUserNickname: title.isEmpty ? nil : title,
        otherUserProfileImage: nil,
        lastMessage: nil,
        lastMessageAt: nil,
        unreadCount: 0,
        roomType: chatChannel,
        isAnonymous: chatChannel == "messages"
      )

      ChatAPIService.shared.setToken(token)
      ChatAPIService.shared.setBaseURL(baseUrl + "/api")
      ChatSocketManager.shared.connect(token: token, baseURL: baseUrl)

      let nav = UINavigationController(rootViewController: vc)
      nav.modalPresentationStyle = .fullScreen
      root.present(nav, animated: true)
      resolve(true)
    }
  }
}
