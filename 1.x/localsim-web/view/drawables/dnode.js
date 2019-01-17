class DNode{
    constructor(gc, node){
        this.gc = gc;
        this.object = node;
        this.fill = null;
        this.item = null;

        this.object.connect_to_all(this, this.responder);
        this.draw();
    }

    responder(event){
        if(event == 'destroy'){
            this.destroy();
        }
        else if(event == 'move'){
            this.move();
        }
        else{
            throw "NotImplementedError";
        }
    }

    move(){
        if(this.object){
            let x = this.object.x * this.gc.zoom_level;
            let y = this.object.y * this.gc.zoom_level;
            let r = NODE_RADIUS * this.gc.zoom_level;

            this.item.attr("cx", x)
                .attr("cy", y)
                .attr("r", r);
        }
        else{
            throw ReferenceError;
        }
    }

    draw(){
        let x = this.object.x * this.gc.zoom_level;
        let y = this.object.y * this.gc.zoom_level;
        let dir_ = this.object.dir;

        let rad = NODE_RADIUS * this.gc.zoom_level;
        let fill = null;

        if(dir_ == 'src'){
            fill = NODE_SRC_FILL;
        }
        else if(dir_ == 'dst'){
            fill = NODE_DST_FILL;
        }
        else if(dir_ == 'seg'){
            fill = SPLIT_FILL;
        }
        else{
            throw 'NotImplementedError';
        }

        this.item = this.gc.create_oval(this, x, y, rad, fill, NODE_OUTLINE);
    }

    destroy(){
        if(this.item){
            this.gc.delete_(this.item);
            this.object.disconnect_to_all(this, this.responder);
            this.object = null;
            this.item = null;
        }
    }


}


//function DNode(object){
//    this.object = object;
//    this.fill = null;
//
//    if(object.dir == 'src'){
//        this.fill = 'green';
//    }
//    else if(object.dir == 'dst'){
//        this.fill = 'red';
//    }
//    else if(object.dir == 'seg'){
//        this.fill = 'purple';
//    }
//
//    this.drawable = gc.canvas.append("circle");
//
//    this.draw = function(){
//        this.drawable.attr("id", 'object')
//            .attr("cx", this.object.x)
//            .attr("cy", this.object.y)
//            .attr("r", '5px')
//            .attr("stroke", 'black')
//            .attr("fill", this.fill)
//            .attr("z-index", 1)
//            .datum(this);
//    };
//
//
//}
