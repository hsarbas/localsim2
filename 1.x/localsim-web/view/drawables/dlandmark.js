class DLandmark{
    constructor(gc, landmark){
        this.gc = gc;
        this.object = landmark;
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
            throw 'NotImplementedError';
        }
    }

    move(){
        if(this.object){
            let x = this.object.x * this.gc.zoom_level;
            let y = this.object.y * this.gc.zoom_level;

            this.item.attr('x', x)
                .attr('y', y);
        }
    }

    draw(){
        if(!this.object){
            throw ReferenceError;
        }

        let x = this.object.x * this.gc.zoom_level;
        let y = this.object.y * this.gc.zoom_level;
        let s = this.object.size * this.gc.zoom_level;

        this.item = this.gc.create_text(this, x, y, s, 'black');
    }

    destroy(){
        if(this.item){
            this.gc.delete_(this.item);
        }
        this.object.disconnect_to_all(this, this.responder);
        this.object = null;
        this.item = null;
    }
}