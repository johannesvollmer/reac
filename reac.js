function run (render, initialstate) {
    let currentstate = initialstate
    render(currentstate)
    
    
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
}
