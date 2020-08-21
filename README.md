# Flutter_iOS_Hook
### 快速版本
Flutter iOS应用安全开发小指南：
1. 遵循已有的iOS开发安全标准，可参考[OWASP Mobile Application Security Verification Standard](https://github.com/OWASP/owasp-masvs)；
2. 遵循Flutter[官方建议](https://flutter.dev/security)，持续观察与更新Flutter和依赖的版本；
3. Flutter将Dart语言编译成iOS汇编代码，还未发现对其的有效逆向；因此在满足通用的开发规范时可暂缓考虑对Dart的额外安全措施，但需持续关注；
4. 关注Flutter与iOS通讯通道plugin传递数据时的安全，可对敏感信息进行加密存储；
5. 关注Flutter中其他[OC实现类](https://api.flutter.dev/objcdoc/Classes.html)，防止泄露隐私数据。

## Flutter安全实践

Flutter是谷歌的移动UI框架，可以快速在iOS和Android上构建高质量的原生用户界面。目前google、ebay、咸鱼等已采用其技术进行应用开发。如果我们需要采用Flutter技术框架，在开发过程中，需要关注哪些安全问题呢？

在移动原生安全方面，[OWASP Mobile Application Security Verification Standard](https://github.com/OWASP/owasp-masvs)定义了一个移动安全开发基准线，其介绍了在数据存储、网络通讯、认证授权等方面移动应用安全实践。在原生开发过程中，可参考其保准，保证应用安全。在Flutter应用中也可遵循相关标准，保障安全。如采用HTTPS进行通讯，不在UserDefaults中存储敏感信息，校验Universal links参数等。

在Flutter的[官方文档](https://flutter.dev/security)中，给出了Flutter应用层的安全实践。其建议采用持续关注更新Flutter版本和相关依赖版本，以防止针对老版本已知安全漏洞的攻击。

除此之外，在Flutter应用开发中，我们还应关注哪些安全实践呢。在讨论这个话题前，我们先了解一下Flutter。

## Flutter 文件目录
在越狱的iOS手机上，使用`Filza`工具，可查看一个Flutter应用程序的目录，主要文件结构如下：
```
Runner.app/
├── Runner
└── Frameworks/
    └── App.framwork
    └── Flutter.framework
    └── example_plugin.framework (each plugin is a separate framework)

```
`Runner`为Flutter的运行引擎，其为程序运行的入口，但其不包含应用业务代码。
`Flutter.framework`为Flutter bundle，也不包含业务代码。
 `App.framework`为业务Dart代码编译后产物，因此该文件是分析的重点。
在`Frameworks`文件夹中，还包含Flutter plugin的bundle, 如笔者的demo app中使用的[`flutter_secure_storage.framwork`](https://github.com/mogol/flutter_secure_storage)，[`flutter_webview_plugin.framwork`](https://github.com/fluttercommunity/flutter_webview_plugin)。
## Flutter 逆向

Flutter将Dart语言编译成iOS的汇编代码，该过程目前没有公开的资料，因此即使没有代码混淆，Flutter应用很难逆向。
目前笔者尚未发现Flutter APP逆向的工具。在[Flutter APP 逆向](https://blog.tst.sh/reverse-engineering-flutter-apps-part-1/)此篇文章中，作者以`Hello world`代码块为例子，分析了Dart sdk、快照剖析、RawOject，为Flutter APP逆向提供了思路。

鉴于目前逆向Flutter存在挑战，目前Dart语言编写的代码安全性较高，难以分析其业务代码逻辑，因此在满足通用的开发规范时可暂缓考虑对Dart的额外安全措施，但需持续关注。

在分析Flutter架构过程中，笔者发现可通过Flutter Plugin可以窥探到应用程序相关的有用信息，因此需要关注该通道的合理使用。

### Flutter Plugin

Flutter Plugin是Fultter和原生通讯渠道。
在Flutter端，MethodChannel API 可以发送与方法调用相对应的消息。
在宿主平台iOS上， [`FlutterMethodChannel iOS API`](https://api.flutter.dev/objcdoc/Classes/FlutterMethodChannel.html)可以接收方法调用并返回结果，实现调用iOS原生代码。如存储敏感数据时使用的keychain（[`flutter_secure_storage`](https://github.com/mogol/flutter_secure_storage)），身份认证相关功能TouchID和FaceID（[`local_auth `](https://github.com/flutter/plugins/tree/master/packages/local_auth)），苹果登录（[`flutter_apple_sign_in Plugin`](https://github.com/tomgilder/flutter_apple_sign_in)），SSL Pinning([`ssl_pinning_plugin`](https://github.com/macif-dev/ssl_pinning_plugin))等Plugin。

由于`FlutterMethodChannel`是由OC实现，因此可以采用hook OC的方式，hook该类的调用，从而在运行时获取到可能有用的信息。

### Flutter Plugin hook
#### 检查Flutter
APP在运行时，应用会加载的需要的module，以笔者的demo app为列子，已加载的module有：
```
/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Runner
/Library/MobileSubstrate/MobileSubstrate.dylib
/usr/lib/libsqlite3.dylib
/System/Library/Frameworks/AVFoundation.framework/AVFoundation
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/FMDB.framework/FMDB
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/Flutter.framework/Flutter
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/MTBBarcodeScanner.framework/MTBBarcodeScanner
/System/Library/Frameworks/QuartzCore.framework/QuartzCore
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/ai_barcode.framework/ai_barcode
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/device_info.framework/device_info
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/flutter_custom_dialog.framework/flutter_custom_dialog
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/flutter_secure_storage.framework/flutter_secure_storage
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/package_info.framework/package_info
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/path_provider.framework/path_provider
/private/var/containers/Bundle/Application/70288CAB-186A-453E-8FBA-B00FEF608CC0/Runner.app/Frameworks/sqflite.framework/sqflite

```
以`Frameworks/Flutter.framework/Flutter`module为切入点，通过检查是否加载该module，从而判断该应用是否采用了Flutter技术。
```javascript
function hasFlutter() {
    var modules = Process.enumerateModules()
    for (var i = 0; i < modules.length; i++) {
        var oneModule = modules[i]
        if (oneModule.path.endsWith('flutter')) {
            return true
        }
    }
    return false
}
```
#### hook plugin
以下代码采用[Frida](https://frida.re/)框架，进行hook。
```javascript
//code from https://gist.github.com/AICDEV/630feed7583561ec9f9421976e836f90

// https://api.flutter.dev/objcdoc/Classes/FlutterMethodChannel.html#/c:objc(cs)FlutterMethodChannel(im)invokeMethod:arguments:
function traceFlutterMethodCall() {
    var className = "FlutterMethodCall"
    var methodName = "+ methodCallWithMethodName:arguments:"
    var hook = ObjC.classes[className][methodName];

    try {
        Interceptor.attach(hook.implementation, {
            onEnter: function (args) {
                this.className = ObjC.Object(args[0]).toString();
                this.methodName = ObjC.selectorAsString(args[1]);
                console.log(this.className + ":" + this.methodName);
                console.log("method: " + ObjC.Object(args[2]).toString());
                console.log("args: " + ObjC.Object(args[3]).toString());
            }
        })
    } catch (err) {
        console.log("error in trace FlutterMethodCall");
        console.log(err);
    }
}
```
`FlutterMethodCall`为类名，`"+ methodCallWithMethodName:arguments:"`为方法名。该信息可在Flutter的[官方文档](https://api.flutter.dev/objcdoc/Classes/FlutterMethodCall.html)中找到，也可通过frida工具，遍历所有flutter相关的函数得到。

笔者Demo app中，采用[`flutter_secure_storage`](https://github.com/mogol/flutter_secure_storage) Plugin, 实现向keychain的write操作，代码如下：
```dart
SecureStorage.set("securestorageitem.masterkey", "AF4ItDx/2aUDKDk/s+Mdi3aGUJ0wTmMRBvMzMEg/yor6dGiQUEPDypQx5vNnfa+/")
```
通过frida hook `FlutterMethodCall`, 输出如下：
```
FlutterMethodCall:methodCallWithMethodName:arguments:
method: write
args: {
    key = "securestorageitem.masterkey";
    options = "<null>";
    value = "AF4ItDx/2aUDKDk/s+Mdi3aGUJ0wTmMRBvMzMEg/yor6dGiQUEPDypQx5vNnfa+/";
}
```

### Flutter plugin安全性
由于可以通过hook方式，运行时获取Flutter与原生通信信息，因此建议在使用Flutter plugin时，对安全级别较高的信息进行加密，加密的方式建议可采用Dart语言提供的lib：如[`encrypt`](https://github.com/leocavalcante/encrypt)。
## 参考文章
[Flutter hook 代码](https://gist.github.com/AICDEV/630feed7583561ec9f9421976e836f90)，[深入理解 Flutter 的编译原理与优化](https://102.alibaba.com/detail/?id=141)，[源码解读Flutter run机制](http://gityuan.com/2019/09/07/flutter_run/)
