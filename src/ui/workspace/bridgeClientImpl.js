/**
 * 大概流程
 *  采用类 client-server 模式实现开发平台 js sdk，有两部分相关代码：
 * 1. client 运行在工作台所加载的 webview 里面
 * 2. server 直接运行在工作台页面里面，也就是主窗口的渲染进程
 * 3. client 和 server 之间的交互，通过 websocket 进行中转
 *
 */

let callbackMap = new Map();
let eventListeners = {};
let requestId = 0;
let client;

function init() {
    const WebSocket = require('ws');
    client = new WebSocket('ws://127.0.0.1:' + 7983 + '/');
    client.on('message', (data) => {
        let obj;
        try {
            obj = JSON.parse(data);
        } catch (e) {
            console.error('parse ws data error', e);
            return;
        }
        if (obj.type === 'wf-op-event') {
            handleOpEvent(obj.handlerName, obj.args);
        } else if (obj.type === 'wf-op-response') {
            handleOpResponse(obj.requestId, obj.args)
        }
    })

    window.__wf_bridge_ = {
        call: call,
        register: register,
    }
    console.log('bridgeClientImpl init')
}

function call(handlerName, args, callback) {
    let reqId = 0;
    if (callback && typeof callback === 'function') {
        reqId = requestId++;
        callbackMap.set(reqId, callback)
    }
    args.host = location.host;
    let obj = {type: 'wf-op-request', requestId: reqId, handlerName, args};
    client.send(JSON.stringify(obj));
}

function handleOpResponse(requestId, args) {
    console.log('handle op response', requestId, args)
    let cb = callbackMap.get(requestId);
    if (cb) {
        cb(args);
        callbackMap.delete(requestId);
    }
}

function handleOpEvent(handlerName, args) {
    eventListeners[handlerName] && eventListeners[handlerName](args);

}

function register(handlerName, callback) {
    eventListeners[handlerName] = callback;
}

init();
