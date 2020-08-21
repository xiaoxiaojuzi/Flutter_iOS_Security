//run: frida -U XXXXXX -l flutter_iOS_hook.js --no-pause

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

//code from https://gist.github.com/AICDEV/630feed7583561ec9f9421976e836f90
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

traceFlutterMethodCall()
