function run (render, initialstate) {
    let currentstate = initialstate
    let currentview = render(initialstate)
    
    forever(() => {
        const input = ...
        if (input) {
        const newstate = update()
        if (newstate !== currentstate) {
        realizeview(currentview, newview)
        const newview = render(newstate)

        currentview = newview
        currentstate = newstate
        }
        }
    })
}

function forever(run){
    function runner(){
        run()
        window.requestAnimationFrame(runner)
    }
}

// usage
run(render, { count: 5 })

function render(state){
    input("button", state.count, { count } => { count: count + 1 })
}
