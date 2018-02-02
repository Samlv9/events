/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
/// @Copyright ~2018 ☜Samlv9☞ and other contributors
/// @MIT-LICENSE | 1.0.0 | https://api.guless.com/
/// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
///                                              }|
///                                              }|
///                                              }|     　 へ　　　 ／|    
///      _______     _______         ______      }|      /　│　　 ／ ／
///     /  ___  |   |_   __ \      .' ____ '.    }|     │　Z ＿,＜　／　　 /`ヽ
///    |  (__ \_|     | |__) |     | (____) |    }|     │　　　　　ヽ　　 /　　〉
///     '.___`-.      |  __ /      '_.____. |    }|      Y　　　　　`　 /　　/
///    |`\____) |    _| |  \ \_    | \____| |    }|    ｲ●　､　●　　⊂⊃〈　　/
///    |_______.'   |____| |___|    \______,'    }|    ()　 v　　　　|　＼〈
///    |=========================================\|    　>ｰ ､_　 ィ　 │ ／／
///    |> LESS IS MORE                           ||     / へ　　 /　ﾉ＜|＼＼
///    `=========================================/|    ヽ_ﾉ　　(_／　 │／／
///                                              }|     7　　　　　　  |／
///                                              }|     ＞―r￣￣`ｰ―＿`
///                                              }|
///                                              }|
/// Permission is hereby granted, free of charge, to any person obtaining a copy
/// of this software and associated documentation files (the "Software"), to deal
/// in the Software without restriction, including without limitation the rights
/// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
/// copies of the Software, and to permit persons to whom the Software is
/// furnished to do so, subject to the following conditions:
///
/// The above copyright notice and this permission notice shall be included in all
/// copies or substantial portions of the Software.
///
/// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
/// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
/// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
/// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
/// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
/// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
/// THE SOFTWARE.
import IEventDispatcher from "./IEventDispatcher";
import IEventListener from "./IEventListener";
import IEventListenerOptions from "./IEventListenerOptions";
import Event from "./Event";
import EventListener from "./EventListener";

/**
 * 定义所有具备事件派发功能对象的基类。
 * @implements {IEventDispatcher}
 * @since 1.0.0
 */
export default class EventDispatcher /*< implements IEventDispatcher >*/ {
    /**
     * 创建一个事件派发器。
     * @param {IEventDispatcher} [target=null] - 指定派发器的代理目标对象。
     * @since 1.0.0
     */
    constructor( target = null ) {
        /**
         * @type {IEventDispatcher}
         */
        this._targetDispatcher = (target || this);
        
        /**
         * @type { {[type:String|Symbol]:Array<EventListener>} }
         */
        this._listenerRegister = {};
        
        /**
         * @type { {type:String|Symbol}: Boolean }
         */
        this._listenerLockers = {};
    }
    
    /**
     * 注册一个事件侦听器。
     * 
     * 侦听器可以注册到派发事件的任何一个阶段。
     * @param {String|Symbol} type - 注册的事件类型。
     * @param {Function|IEventListener} handler - 指定事件处理函数或者是一个事件侦听器。
     * @param {Boolean|IEventListenerOptions} [options=false] - 指定侦听器配置选项。
     * @since 1.0.0
     */
    addEventListener( type, handler, options = false ) {
        if ( !handler ) {
            throw new SyntaxError("handler 必须为事件处理函数(function)或者是事件侦听器(IEventListener)。");
        }
        
        const listener = new EventListener(handler, options);
        
        /**
         * 在事件派发过程中修改侦听器列表会导致派发顺序错误，因此这里需要拷贝侦听器列表的副本。
         * 
         * @example
         * const dispatcher = new EventDispatcher();
         * dispatcher.addEventListener("custom", () => { // 如果不锁定侦听器列表的化，这里将产生一个死循环。
         *     console.log(1}; 
         *     dispatcher.addEventListener("custom", () => {}, { "priority": 1 });
         * });
         * dispatcher.dispatchEvent(new Event("custom", false, false"));
         */
        if ( this._listenerLockers[type] ) {
            this._listenerLockers[type] = false;
            this._listenerRegister[type] = this._listenerRegister[type].slice(0);
        }
        
        /// 移除重复的事件侦听器。
        this.removeEventListener(type, handler, listener.options.useCapture);
        
        /// 没有为 type 类型的事件注册侦听器。
        if ( !this.hasEventListener(type) ) {
            this._listenerRegister[type] = [listener];
            return;
        }
        
        /// 为 type 类型已经注册的侦听器列表。
        const items = this._listenerRegister[type];
        
        /**
         * 一般情况下，我们注册的侦听器的优先级都是默认的 0。因此这里可以先对比插入的侦听器的优先级是否为最低的优先级。
         * 如果是则直接放入列表末尾。从而减少为插入侦听器而遍历列表的次数。
         */
        if ( items[items.length - 1].options.priority >= listener.options.priority ) {
            items.push(listener);
            return;
        }
        
        /**
         * 按照侦听器注册的顺序以及侦听器优先级的大小插入列表。
         * - 1, 优先越高的侦听器放到列表的前面。
         * - 2, 相同优先级的情况，先注册的侦听器放到列表的前面。
         */
        let insertAt = items.length - 1;
        while( ((insertAt >= 0) && (items[insertAt].options.priority < listener.options.priority)) ) { --insertAt; }
        
        items.splice(1 + insertAt, 0, listener);
    }
    
    /**
     * 移除一个事件侦听器。
     * 
     * 第三个参数 `useCapture` 可以是一个 {@link Boolean} 类型的值，或者是一个 {@link IEventListenerOptions} 类型的值。
     * ```
     * dispatcher.removeEventListener(type, handler, false); // useCapture = false;
     * dispatcher.removeEventListener(type, handler, { "useCapture": true }); // useCapture = { "useCapture": true };
     * ```
     * 
     * 只有完全相同（使用 === 对比）的侦听器才会被移除。因此使用 `useCapture=false` 并不会移除**捕获阶段**的侦听器。
     * 同理 `useCapture=true` 也不会移除**冒泡阶段**的侦听器。
     * ```
     * const dispatcher = new EventDispatcher();
     * 
     * function captureHandler( evt ) {
     *     console.log("capture");
     * }
     * 
     * dispatcher.addEventListener("custom", captureHandler, true); // 注册一个捕获阶段的侦听器。
     * dispatcher.removeEventListener("custom", captureHandler, false); // 这里并不会移除 captureHandler 侦听器。
     * dispatcher.hasEventListener("custom"); // true
     * dispatcher.removeEventListener("custom", captureHandler, true); // 这里才会移除 captureHandler 侦听器。
     * dispatcher.hasEventListener("custom"); // false
     * ```
     * @param {String|Symbol} type - 移除的事件类型。
     * @param {Function|IEventListener} handler - 指定要移除的事件处理函数或者事件侦听器。
     * @param {Boolean|IEventListenerOptions} [useCapture=false] - 指定是移除捕获阶段(`true`)还是冒泡阶段(`false`)的事件侦听器。
     * @since 1.0.0
     */
    removeEventListener( type, handler, useCapture = false ) {
        if ( !this.hasEventListener(type) ) {
            return;
        }
        
        /**
         * 如果 `useCapture` 是一个 {@link IEventListenerOptions} 对象，则获取 `IEventListenerOptions.useCapture` 的值。
         */
        if ( typeof useCapture != "boolean" ) {
            /** @type {IEventListenerOptions} */
            const options = useCapture;
            useCapture = (options.useCapture !== void 0 ? options.useCapture : false);
        }
        
        /**
         * 在事件派发过程中修改侦听器列表会导致派发顺序错误，因此这里需要拷贝侦听器列表的副本。
         * @see {@link EventDispatcher#addEventListener}
         */
        if ( this._listenerLockers[type] ) {
            this._listenerLockers[type] = false;
            this._listenerRegister[type] = this._listenerRegister[type].slice(0);
        }
        
        for ( let i = 0, items = this._listenerRegister[type]; i < items.length; ++i ) {
            /**
             * 只有完全相同（使用 === 对比）的侦听器才会被移除。
             */
            if ( handler === items[i].handler && useCapture === items[i].options.useCapture ) {
                items.splice(i, 1);
                break;
            }
        }
    }
    
    /**
     * 检查是否注册了指定类型的事件侦听器。
     * @param {String|Symbol} type - 检查的事件类型。
     * @example
     * const dispatcher = new EventDispatcher();
     * dispatcher.addEventListener("custom", ( evt ) => {}, false);
     * 
     * console.log(dispatcher.hasEventListener("custom")); // true
     * console.log(dispatcher.hasEventListener("notexists")); // false
     * @returns {Boolean} - 如果存在指定类型的侦听器则返回 `true`，否则返回 `false`。
     * @since 1.0.0
     */
    hasEventListener( type ) {
        return (this._listenerRegister[type] && this._listenerRegister[type].length >= 1);
    }
    
    /**
     * 派发一个事件对象到目标对象的事件流中。
     * @param {Event} event - 指定派发的事件对象。
     * @returns {Boolean} - 如果事件传递到了当前目标对象，并且没有被取消默认行为。则返回 `true`，否则返回 `false`。
     * @since 1.0.0
     */
    dispatchEvent( event ) {
        
    }
}