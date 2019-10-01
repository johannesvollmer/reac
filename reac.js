
// setup hollow library object
window.reac = {
    element: (tag, attributes, children) => ({ tag, attributes, children }),
    html: {}
}

// define html element shortcut constructor functions
for (let tag of "nav div a p span input form button label img svg canvas main section h1 h2 h3 h4 h5 h6".split(" "))
    window.reac.html[tag] = (attributes, children) => window.reac.element(tag, attributes, children)

    
// add main reac function
window.reac.run = (root, render, initialstate) => {
    if (root == null)
        throw "Reac root element is not defined"

    if (root.childElementCount != 0)
        throw "Reac root element is not empty"

    // the mutable state of the app, passed to the event listeners
    const state = initialstate

    // keep track of whether we need to re-render
    let stateHasChanged = true

    // the currently rendered "virtual dom" of this reac runner
    let currentView = null
    
    repeat(() => {
        if (stateHasChanged) {
            const nextView = render(state) // TODO should be able to return arrays and strings?   // TODO components would allow truly partial updates
            updateElement(root, { children: [currentView] }, { children: [nextView] })

            currentView = nextView
            stateHasChanged = false
        }

        return true // currently, run forever
    })
            

    function updateElement(native, currentView, newView){
        // replace object if tag changes
        if (currentView.tag !== newView.tag){
            const newNative = createNativeElement(newView)
            native.parentNode.replaceChild(newNative, native)
            return
        }
        
        // enable style comparison
        compileView(newView)

        // update existing attributes
        for (let updatedName in newView.attributes){
            const newValue = newView.attributes[updatedName]
            if (newValue !== currentView.attributes[updatedName]){ // FIXME this will not compare style objects
                native[updatedName] = createNativeAttribute(updatedName, newValue)
                // console.log("updated attribute", updatedName, newValue)
            }
        }

        // delete unwanted attributes
        for (let existingName in currentView.attributes){
            if (newView.attributes[existingName] == undefined)
                delete native[name] // TODO make sure this does not throw errors!
        }

        // insert missing, remove unwanted, and update outdated children
        // shortcut: remove all children
        if (!hasChildren(newView)){
            if (hasChildren(currentView))   
                native.innerHTML = ""
        } 

        // otherwise, handle complex scenarios         
        else {
            // TODO use something smarter which allows better reusage where children are removed
            for (let index = 0; index < newView.children.length; index++){
                const newChild = newView.children[index]
                const currentChild = currentView.children[index]

                if (currentChild == undefined){
                    native.appendChild(createNativeElement(newChild))
                    // console.log("\tinserting new child", createNativeElement(newChild))
                }

                else {
                    updateElement(native.children[index], currentChild, newChild)
                }
            }

            // remove children at the end
            while(native.childElementCount > newView.children.length)
                native.removeChild(native.lastChild)
        }
    }

    // converts object attributes to string
    function compileView(view){
        // convert style to string to enable attribute comparison
        if (view.attributes != undefined && typeof view.attributes.style === "object"){ // also checks for undefined
            view.attributes.style = Object.entries(view.attributes.style)
                .map(([key, value]) => key + ": " + value).join("; ")
        }
    }

    /// will only be called on realizing change, not on render
    function createNativeAttribute(name, attribute){
        if (attribute == null)
            return null

        // handle special case: attribute is an event listener
        else if (name.startsWith("on") && typeof attribute === "function")
            return event => {
                let stateHasJustBeenChanged = true // assume change for now
                
                const returned = attribute(state, event, () => stateHasJustBeenChanged = false)
                if (returned !== undefined) state = returned
    
                stateHasChanged = stateHasChanged || stateHasJustBeenChanged
            }

        else return attribute
    }

    function hasChildren(element){
        return element.children != undefined && element.children.length !== 0
    }

    function createNativeElement(element){
        compileView(element)

        const native = element.namespace == null? 
            document.createElement(element.tag) :
            document.createElementNS(element.tag, element.namespace)

        if (element.attributes != null)
            for (let attributeName in element.attributes) 
                native[attributeName] = createNativeAttribute(attributeName, element.attributes[attributeName])   
        
        if (hasChildren(element))
            for (let child of element.children)
                native.appendChild(createNativeElement(child))

        return native
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

