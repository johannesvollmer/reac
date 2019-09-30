function run (render, initialstate) {
    let currentstate = initialstate
    render(currentstate)
    
    window.requestAnimationFrame(run)
}

// usage
run(render, { count: 5 })

function render(state){
}
