function run (render, initialstate) {
    let currentstate = initialstate
    
    forever(() => {
        const newview = render(currentstate)
    })
}

function forever(run){
    runner()
    function runner(){
        run()
        window.requestAnimationFrame(runner)
    }
}

// usage
run(render, { count: 5 })

function render(state){
}
