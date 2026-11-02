import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ application: UIApplication,
                     configurationForConnecting connectingSceneSession: UISceneSession,
                     options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: "Default Configuration",
                                          sessionRole: connectingSceneSession.role)
        config.delegateClass = SceneDelegate.self
        return config
    }
}

// Safe areas live in CSS; keyboard resizing is owned by Capacitor Keyboard.
class StatsMasterViewController: CAPBridgeViewController {
    override var preferredStatusBarStyle: UIStatusBarStyle { .darkContent }
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(AdPresentationPlugin())
        webView?.allowsBackForwardNavigationGestures = true
        webView?.allowsLinkPreview = false
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        webView?.scrollView.showsHorizontalScrollIndicator = false
        webView?.scrollView.showsVerticalScrollIndicator = false
    }
}


@objc(AdPresentationPlugin)
class AdPresentationPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "AdPresentationPlugin"
    let jsName = "AdPresentation"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "context", returnType: CAPPluginReturnPromise)
    ]

    @objc func context(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            guard let window = self?.bridge?.viewController?.view.window,
                  let scene = window.windowScene,
                  let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
                call.resolve(["allowed": false]); return
            }
            let screen = scene.screen
            // Suppress all external-display configurations, including plain mirroring.
            let external = UIScreen.screens.contains { $0 != UIScreen.main }
            let allowed = screen == UIScreen.main && !screen.isCaptured && !external
                && scene.activationState == .foregroundActive && window.isKeyWindow
                && appDelegate.window === window
                && window.rootViewController?.presentedViewController == nil
            call.resolve(["allowed": allowed])
        }
    }
}
