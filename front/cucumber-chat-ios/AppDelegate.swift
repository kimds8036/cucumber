import UIKit

@main
class AppDelegate: UIResponder, UIApplicationDelegate {
    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        window = UIWindow(frame: UIScreen.main.bounds)
        window?.rootViewController = makeRootViewController()
        window?.makeKeyAndVisible()
        return true
    }

    private func makeRootViewController() -> UIViewController {
        let messagesVC = MessagesViewController()
        let nav = UINavigationController(rootViewController: messagesVC)
        nav.setNavigationBarHidden(true, animated: false)
        return nav
    }

    func connectSocket(token: String, baseURL: String) {
        ChatAPIService.shared.setToken(token)
        ChatAPIService.shared.setBaseURL(baseURL + "/api")
        ChatSocketManager.shared.connect(token: token, baseURL: baseURL)
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        ChatSocketManager.shared.disconnect()
    }
}
