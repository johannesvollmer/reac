
window.reac = {}

window.reac.element = (tag, attributes, listeners, children) => ({ tag, attributes, listeners, children })

window.reac.run = (root, render, initialstate) => {
    if (root == null)
        throw "Reac root element is not defined"

    if (root.childElementCount != 0)
        throw "Reac root element is not empty"

    const state = initialstate
    let stateHasChanged = true

    const view = {
        current: null,
        emerging: null
    }
    
    repeat(() => {
        if (stateHasChanged) {
            view.emerging = render(state) // TODO should be able to return arrays and strings?
            realize()

            stateHasChanged = false
        }

        return true // currently, run forever
    })

    function realize(){
        if (view.emerging !== view.current){
            updateElement(root, { children: [view.current] }, { children: [view.emerging] })
            view.current = view.emerging
        }

        function updateElement(native, currentView, newView){
            if (currentView === newView) 
                return
            
            if (currentView.tag !== newView.tag){
                const newNative = createElement(newView)
                native.parentNode.replaceChild(newNative, native)
                return
            }
            
            updateDifference(currentView.attributes, newView.attributes, (name, value) => native[name] = value)
            updateDifference(currentView.listeners, newView.listeners, (name, value) => native[name] = createListener(value))
            
            // insert missing, remove unwanted, and update outdated children
            if (currentView.children !== newView.children){
                // TODO use something smarter which allows better reusage where children are removed
                for (let index = 0; index < newView.children.length; index++){
                    const newChild = newView.children[index]
                    const currentChild = currentView.children[index]

                    if (currentChild === null || currentChild === undefined){
                        native.appendChild(createElement(newChild))
                        console.log("\tinserting new", createElement(newChild))
                    }

                    else if (currentChild !== newChild){
                        updateElement(native.children[index], currentChild, newChild)
                        console.log("\tupdating existing child", newChild)
                    }

                    else {
                        console.log("did not touch", currentChild)
                    }
                }

                // remove children at the end
                while(native.childElementCount > newView.children.length)
                    native.removeChild(native.lastChild)
            }

        }

        function updateDifference(current, updated, update){
            if (current !== updated){
                for (let updatedName in updated){
                    const newValue = updated[updatedName]
                    
                    if (newValue !== current[updatedName]){
                        update(updatedName, newValue)
                        console.log("updated", updatedName, newValue)
                    }
                }

                for (let existingName in current){
                    if (updated[existingName] == undefined)
                        update(existingName, undefined)
                }
            }
        }

        function createElement(element){
            const native = element.namespace == null? 
                document.createElement(element.tag) :
                document.createElementNS(element.tag, element.namespace)

            if (element.attributes != null)
                for (let attributeName in element.attributes) 
                    native[attributeName] = element.attributes[attributeName]   
                  
            if (element.listeners != null)
                for (let eventType in element.listeners) 
                    native[eventType] = createListener(element.listeners[eventType])
            
            if (element.children != null)
                for (let child of element.children)
                    native.appendChild(createElement(child))

            return native
        }

        function createListener(listener){
            if (listener == null) 
                return null
            
            return event => {
                let stateHasJustBeenChanged = true // assume state has been changed for now
                
                const returned = listener(state, event, () => stateHasJustBeenChanged = false)
                if (returned !== undefined) state = returned

                stateHasChanged = stateHasChanged || stateHasJustBeenChanged
            }
        }
    }
    
    function repeat(run){
        runner()
        function runner(){
            const keepRunning = run()
            if (keepRunning)
                window.requestAnimationFrame(runner)
        }
    }
}

