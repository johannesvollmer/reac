
// setup hollow library object
window.reac = { 
    html: {},
    stopPropagation: (state, event, preventUpdate) => { 
        event.stopPropagation()
        preventUpdate()
    } 
};

(() => {
    // export generic element function    
    window.reac.element = createView
    
    // export html element shortcut constructor functions
    for (let tag of "nav div a p span input form button label img svg canvas main section h1 h2 h3 h4 h5 h6 br".split(" "))
        window.reac.html[tag] = (attributes, children) => createView(tag, attributes, children)


    // compute all the redundant data here, because post-recursive alteration seems to be slow
    function createView(tag, attributes, children){
        if (tag == undefined) throw "Element tag must be defined"
        if (children == undefined) children = []
        if (attributes == undefined) attributes = []

        // convert stype object to string, if required
        if (typeof attributes.style === "object"){ // typeof also checks for undefined
            let compiledStyle = ""
            for(let attribute in attributes.style)
                compiledStyle += attribute + ": " + attributes.style[attribute] + "; "

            attributes.style = compiledStyle
        }

        // compute a reverse lookup table for children
        const hashedChildren = new Map()
        for (let child of children){
            let elements = hashedChildren.get(child.hash)
            if (elements == undefined) hashedChildren.set(elements = [])

            // add this element to the list of elements with the same hash
            elements.push(child)
        }

        // compute our own hash
        const hash = (hashString(tag) * 31 + hashString(attributes.id)) * 31 + children.length 
        
        return { 
            tag, attributes, children, hash, 
            hashedChildren, native: undefined // fixed structure allows field optimization
        } 
    }

    function hashString(string){
        if (string == undefined || string.length === 0) return 0
        else return string.length * 31 + string.charCodeAt(Math.floor((string.length - 1) / 2)) * 7 + string.charCodeAt(0) * 3 + string.charCodeAt(string.length - 1)
    }
})()


    
// add main reac function
window.reac.run = (root, render, initialState) => {
    if (root == null)
        throw "Reac root element must be defined"

    // the mutable state of the app, updated only inside event listeners
    const state = initialState

    // keep track of whether we need to re-render
    let stateHasChanged = true

    // the currently rendered "virtual dom" of this reac runner
    // will be compared to the new view in order to only update modified properties
    let currentView = null
    
    repeat(() => {
        if (stateHasChanged) {
            const nextView = render(state) // TODO should be able to return arrays and strings?   // TODO components would allow truly partial updates
            root = updateElement(root, currentView, nextView)

            currentView = nextView
            stateHasChanged = false
        }

        return true // currently, run forever
    })
            

    function updateElement(native, currentView, newView){
        // replace object if none exists yet or if the tag changes
        if (currentView == null || currentView.tag !== newView.tag){
            const newNative = createNativeElement(newView)
            native.parentNode.replaceChild(newNative, native)
            return newNative
        }
        
        // update existing attributes
        for (let updatedName in newView.attributes){
            const newValue = newView.attributes[updatedName]
            if (newValue !== currentView.attributes[updatedName]){ 
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
        if (newView.children.length == 0){
            if (currentView.children.length != 0)   
                native.innerHTML = ""
        }

        // otherwise, handle complex scenarios         
        else {
            // TODO maintain child order!!!
            for (let index = 0; index < newView.children.length; index++){
                const newChild = newView.children[index]

                // find the element which was at that child index the last time
                let predecessor = null

                const atIndex = currentView.children[index]
                if (atIndex != undefined && atIndex.hash === newChild.hash)
                    predecessor = atIndex

                // check neighbours (if something was deleted)
                if (predecessor == null || predecessor.native == null || predecessor.hash != newChild.hash){
                    const sibling = currentView.children[index + 1]
                    if (sibling != undefined && sibling.hash === newChild.hash) // equal hash means equal tag and equal id
                        predecessor = sibling
                }

                if (predecessor == null || predecessor.native == null || predecessor.hash != newChild.hash){
                    const sibling = currentView.children[index - 1]
                    if (sibling != undefined && sibling.hash === newChild.hash) // equal hash means equal tag and equal id
                        predecessor = sibling
                }

                // if hash does not match, find a better reusable element by looking up the hashmap
                if (predecessor == null || predecessor.native == null || predecessor.hash != newChild.hash){
                    const elements = currentView.hashedChildren.get(newChild.hash) // equal hash means equal tag and equal id
                    if (elements != undefined) predecessor = elements.pop()
                }

                // TODO reuse another element with similar tag?
                // create a predecessor if no unused native has been found, otherwise reuse the old native element 
                if (predecessor == null || predecessor.native == null){
                    native.appendChild(createNativeElement(newChild))
                }
                else {
                    updateElement(predecessor.native, predecessor, newChild) 
                    predecessor.native = null
                }
            }

            // remove all children which have not been reused
            for(let predecessor of currentView.children)
                if (predecessor.native != null) 
                    native.removeChild(predecessor.native)
        }

        newView.native = native
        return native
    }

    /// will only be called on realizing change, not on render
    function createNativeAttribute(name, attribute){
        if (attribute == null)
            return null

        // handle special case: attribute is an event listener
        else if (name.startsWith("on") && typeof attribute === "function")
            return event => {
                let stateHasJustBeenChanged = true // assume change for now
                const preventUpdate = () => stateHasJustBeenChanged = false
                
                const returned = attribute(state, event, preventUpdate)
                if (returned !== undefined) state = returned
    
                stateHasChanged = stateHasChanged || stateHasJustBeenChanged
            }

        else return attribute
    }

    function createNativeElement(element){
        const native = element.namespace == null? 
            document.createElement(element.tag) :
            document.createElementNS(element.tag, element.namespace)

        for (let attributeName in element.attributes) 
            native[attributeName] = createNativeAttribute(attributeName, element.attributes[attributeName])   
        
        for (let child of element.children)
            native.appendChild(createNativeElement(child))

        element.native = native
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

