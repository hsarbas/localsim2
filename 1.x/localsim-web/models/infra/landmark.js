class Landmark extends Signal{
    constructor(x, y, size, label, angle=0){
        super();

        this.x = x;
        this.y = y;
        this.size = size;
        this.label = label;
        this.angle=angle;

        this.events = ['move', 'destroy'];
    }

    move(x, y){
        let change = false;

        if(x != null && x != this.x){
            this.x = x;
            change = true;
        }

        if(y != null && y != this.y){
            this.y = y;
            change = true;
        }

        if(change){
            this.fire('move');
        }
    }

    destroy(){
        this.fire('destroy');
    }

    deconstruct(){
        const _cls = "localsim.models.infra.landmark.Landmark";
        const _args = [this.x, this.y, this.size, this.label, this.angle];
        const _kwargs = {};
        return [_cls, _args, _kwargs]
    }
}