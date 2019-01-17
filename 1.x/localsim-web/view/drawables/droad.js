class DURoad{
    constructor(gc, uroad){
        this.gc = gc;
        this.object = uroad;
        this.item = null;
        this.lane_markings = [];
        this.object.connect_to_all(this, this.responder);
        this.draw();
    }

    responder(event, source){
        if(!this.object){
            this.object = source;
        }

        if(event == 'move'){
            this.move();
            this._move_lane_markings();
        }
        else if(event == 'change'){
            this.move();
            this._clear_lanes();
            this._draw_lanes();
        }

        else if(event == 'destroy'){
            this.destroy();
        }

        else{
            throw 'NotImplementedError';
        }
    }

    destroy(){
        if(this.item){
            this._clear_lanes();
            this.gc.delete_(this.item);
            this.object.disconnect_to_all(this, this.responder);
            this.object = null;
            this.item = null;
        }
    }

    get_segment(x, y){
        for(let ctr = 0; ctr<this.object.segments.segments.length; ctr++){
            let segment = this.object.segments.segments[ctr];
            let src = segment.src;
            let dst = segment.dst;

            let ret = delta_pt_in_perp_line(src.x, src.y, dst.x, dst.y, this.object.width / 2.0);
            let dx = ret[0];
            let dy = ret[1];

            // get segment mouse is currently over
            if(point_in_polygon(x, y, src.x - dx, src.y - dy, dst.x - dx, dst.y - dy,
                    dst.x + dx, dst.y + dy, src.x + dx, src.y + dy)){
                return segment;
            }
        }
        return null;
    }

    move(){
        if(!this.object){
            throw ReferenceError;
        }

        let points = this._get_draw_points();
        let w = this.object.width * this.gc.zoom_level;

        let line = d3.line()
            .x(function(d){ return d.get('x')})
            .y(function(d){ return d.get('y') });

        this.item.attr("d", line(points));
        this.item.attr("stroke-width", w);
    }

    draw(){
        if(!this.object){
            throw ReferenceError;
        }

        let points = this._get_draw_points();
        let w = this.object.width * this.gc.zoom_level;

        this.item = this.gc.create_line(this, points, null, null, w, 'none', UROAD_FILL);
        this._draw_lanes();
    }

    _get_draw_points(){
        let uroad = this.object;
        let points = [];

        let src_map = new Map();
        src_map.set('x', uroad.src.x * this.gc.zoom_level);
        src_map.set('y', uroad.src.y * this.gc.zoom_level);

        points.push(src_map);

        for(let xy of uroad.segments.get_split_xy()){
            xy.set('x', xy.get('x') * this.gc.zoom_level);
            xy.set('y', xy.get('y') * this.gc.zoom_level);
            points.push(xy);
        }
        let dst_map = new Map();
        dst_map.set('x', uroad.dst.x * this.gc.zoom_level);
        dst_map.set('y', uroad.dst.y * this.gc.zoom_level);
        points.push(dst_map);


        return points;
    }

    _get_lane_marking_points(seg, lane){
        let points = [];
        let d = (this.object.width / 2.0) - (lane * this.object.get_lane_width());

        let ret = delta_pt_in_perp_line(seg.src.x, seg.src.y, seg.dst.x, seg.dst.y, d);
        let lat_px = ret[0];
        let lat_py = ret[1];

        let temp = new Map();
        temp.set('x', seg.src.x - lat_px);
        temp.set('y', seg.src.y - lat_py);
        points.push(temp);

        temp = new Map();
        temp.set('x', seg.dst.x - lat_px);
        temp.set('y', seg.dst.y - lat_py);
        points.push(temp);

        for(let point of points){
            point.set('x', point.get('x') * this.gc.zoom_level);
            point.set('y', point.get('y') * this.gc.zoom_level);
        }

        return points;
    }

    _move_lane_markings(){
        let ctr=0;
        for(let seg of this.object.segments.segments){
            for(let lane=1; lane<this.object.get_lanes(); lane++){
                let points = this._get_lane_marking_points(seg, lane);
                let line = d3.line()
                    .x(function(d){ return d.get('x')})
                    .y(function(d){ return d.get('y') });
                this.lane_markings[ctr].attr("d", line(points));
                ctr += 1;
            }
        }
    }

    _draw_lanes(){

        for(let seg of this.object.segments.segments){
            for(let lane=1; lane<this.object.get_lanes(); lane++){
                let points = this._get_lane_marking_points(seg, lane);

                let m = this.gc.create_line('lane_marking', points, null, null, 0.5, null, LANE_MARKING_STROKE, true);
                this.lane_markings.push(m);
            }
        }
    }

    _clear_lanes(){
        for(let lane_marking of this.lane_markings){
            this.gc.delete_(lane_marking);
        }
        this.lane_markings = [];
    }
}


class DIRoad{
    constructor(gc, iroad){
        this.gc = gc;
        this.object = iroad;
        this.item = null;
        this.lane_markings = [];
        this.object.connect_to_all(this, this.responder);
        this.draw();

        this.points = this._get_draw_points();
    }

    responder(event, source){
        if(!this.object){
            this.object = source;
        }

        if(event == 'move'){
            this.move();
            this._move_lane_markings();
        }

        else if(event == 'change'){
            this.move();
            this._clear_lanes();
            this._draw_lanes();
        }

        else if(event == 'destroy'){
            this.destroy();
        }

        else{
            throw 'NotImplementedError';
        }
    }

    draw(){
        if(!this.object){
            throw ReferenceError;
        }

        let points = this._get_draw_points();
        let w = this.object.width * this.gc.zoom_level;

        this.item = this.gc.create_line(this, points, null, null, w, 'none', IROAD_FILL);
        this.item.lower();

        this._draw_lanes();
    }

    move(){
        if(!this.object){
            throw ReferenceError;
        }

        let w = this.object.width * this.gc.zoom_level;
        this.points = [];
        this.points = this._get_draw_points();

        let line = d3.line()
            .x(function(d){ return d.get('x')})
            .y(function(d){ return d.get('y')});

        this.item.attr("d", line(this.points));
        this.item.attr("stroke-width", w);
    }

    _get_segment(x, y){

    }

    _get_draw_points(){
        let iroad = this.object;
        let first_segment = iroad.segments.segments[0];
        let last_segment = iroad.segments.segments[iroad.segments.segments.length - 1];
        let points = [];
        let in_lanes = [];
        let out_lanes = [];
        let key = null;
        let value = null;

        for([key, value] of iroad.in_matrix){
            in_lanes.push(key);
        }

        for([key, value] of iroad.out_matrix){
            out_lanes.push(value);
        }

        let lane_s = (in_lanes[0] + in_lanes[in_lanes.length-1]) / 2.0;
        let lane_d = (out_lanes[0] + out_lanes[out_lanes.length-1]) / 2.0;

        let ret = this.trans_node(iroad.src_road.segments.segments[iroad.src_road.segments.segments.length-1], lane_s,
            iroad.src_road.width, iroad.src_road.get_lane_width());
        let trans_sx = ret[0];
        let trans_sy = ret[1];

        let xs = first_segment.src.x + trans_sx;
        let ys = first_segment.src.y + trans_sy;

        ret = this.trans_node(iroad.dst_road.segments.segments[0], lane_d, iroad.dst_road.width,
            iroad.dst_road.get_lane_width());

        let trans_dx = ret[0];
        let trans_dy = ret[1];

        let xd = last_segment.dst.x + trans_dx;
        let yd = last_segment.dst.y + trans_dy;


        let src_map = new Map();
        src_map.set('x', xs * this.gc.zoom_level);
        src_map.set('y', ys * this.gc.zoom_level);
        points.push(src_map);

        for(let xy of iroad.segments.get_split_xy()){
            xy.set('x', xy.get('x') * this.gc.zoom_level);
            xy.set('y', xy.get('y') * this.gc.zoom_level);
            points.push(xy);
        }
        let dst_map = new Map();
        dst_map.set('x', xd * this.gc.zoom_level);
        dst_map.set('y', yd * this.gc.zoom_level);
        points.push(dst_map);
        return points;
    }

    trans_node(segment, lane, width, lane_width){
        return delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y,
            lane * lane_width + (lane_width - width)/2.0);
    }

    destroy(){
        if(this.item){
            this._clear_lanes();
            this.gc.delete_(this.item);
            this.object.disconnect_to_all(this, this.responder);
            this.object = null;
            this.item = null;
        }
    }

    get_segment(x, y){
        let segments = this.object.segments.segments;

        for(let segment of segments){
            let src = segment.src;
            let dst = segment.dst;
            let dx = 0;
            let dy = 0;
            let ret = null;

            if(segments.length == 1){
                src = {x: this.points[0].get('x') / this.gc.zoom_level, y: this.points[0].get('y') / this.gc.zoom_level};
                dst = {x: this.points[1].get('x') / this.gc.zoom_level, y: this.points[1].get('y') / this.gc.zoom_level};
            }
            else if(segment == segments[0]){
                src = {x: this.points[0].get('x') / this.gc.zoom_level, y: this.points[0].get('y') / this.gc.zoom_level};
            }
            else if(segment == segments[segments.length - 1]){
                dst = {x: this.points[this.points.length-1].get('x') / this.gc.zoom_level, y: this.points[this.points.length-1].get('y') / this.gc.zoom_level};
            }

            ret = delta_pt_in_perp_line(src.x, src.y, dst.x, dst.y, this.object.width / 2.0);
            dx = ret[0];
            dy = ret[1];

            // get segment mouse is currently over
            if(point_in_polygon(x, y, src.x - dx, src.y - dy, dst.x - dx, dst.y - dy,
                    dst.x + dx, dst.y + dy, src.x + dx, src.y + dy)){
                return segment;
            }
        }
        return null;
    }

    _get_lane_marking_points(seg, lane, first, last){
        let points = [];

        if(this.object.segments.segments.length == 1){
            let key_iter = this.object.in_matrix.keys();
            let keys = [];
            for(let ctr=0; ctr<this.object.in_matrix.size; ctr++){
                keys.push(key_iter.next().value);
            }

            let ret = this.trans_node(this.object.src_road.segments.segments[this.object.src_road.segments.segments.length-1],
                (keys[keys.length-1]+keys[0])/2.0, this.object.src_road.width, this.object.src_road.get_lane_width());
            let px = ret[0];
            let py = ret[1];

            let sx = first.src.x + px;
            let sy = first.src.y + py;

            let d = (this.object.width / 2.0) - (lane * this.object.get_lane_width());

            ret = delta_pt_in_perp_line(sx, sy, first.dst.x, first.dst.y, d);
            let lat_sx = ret[0];
            let lat_sy = ret[1];

            let temp = new Map();
            temp.set('x', sx - lat_sx);
            temp.set('y', sy - lat_sy);
            points.push(temp);

            let val_iter = this.object.out_matrix.values();
            let values = [];
            for(let ctr=0; ctr<this.object.out_matrix.size; ctr++){
                values.push(val_iter.next().value);
            }

            ret = this.trans_node(this.object.dst_road.segments.segments[this.object.dst_road.segments.segments.length-1],
                (values[values.length-1]+values[0])/2.0, this.object.dst_road.width, this.object.dst_road.get_lane_width());
            px = ret[0];
            py = ret[1];
            let dx = last.dst.x + px;
            let dy = last.dst.y + py;

            ret = delta_pt_in_perp_line(last.src.x, last.src.y, dx, dy, d);
            let lat_dx = ret[0];
            let lat_dy = ret[1];

            temp = new Map();
            temp.set('x', dx - lat_dx);
            temp.set('y', dy - lat_dy);
            points.push(temp);
        }

        else if(seg == first){
            let key_iter = this.object.in_matrix.keys();
            let keys = [];
            for(let ctr=0; ctr<this.object.in_matrix.size; ctr++){
                keys.push(key_iter.next().value);
            }

            let ret = this.trans_node(this.object.src_road.segments.segments[this.object.src_road.segments.segments.length-1],
                (keys[keys.length-1]+keys[0])/2.0, this.object.src_road.width, this.object.src_road.get_lane_width());
            let px = ret[0];
            let py = ret[1];

            let sx = first.src.x + px;
            let sy = first.src.y + py;

            let d = (this.object.width / 2.0) - (lane * this.object.get_lane_width());

            ret = delta_pt_in_perp_line(sx, sy, first.dst.x, first.dst.y, d);
            let lat_sx = ret[0];
            let lat_sy = ret[1];

            let temp = new Map();
            temp.set('x', sx - lat_sx);
            temp.set('y', sy - lat_sy);
            points.push(temp);

            temp = new Map();
            temp.set('x', seg.dst.x - lat_sx);
            temp.set('y', seg.dst.y - lat_sy);
            points.push(temp);
        }

        else if(seg == last){
            let val_iter = this.object.out_matrix.values();
            let values = [];
            for(let ctr=0; ctr<this.object.out_matrix.size; ctr++){
                values.push(val_iter.next().value);
            }

            let ret = this.trans_node(this.object.dst_road.segments.segments[this.object.dst_road.segments.segments.length-1],
                (values[values.length-1]+values[0])/2.0, this.object.dst_road.width, this.object.dst_road.get_lane_width());
            let px = ret[0];
            let py = ret[1];
            let dx = last.dst.x + px;
            let dy = last.dst.y + py;

            let d = (this.object.width / 2.0) - (lane * this.object.get_lane_width());

            ret = delta_pt_in_perp_line(last.src.x, last.src.y, dx, dy, d);
            let lat_dx = ret[0];
            let lat_dy = ret[1];

            let temp = new Map();
            temp.set('x', seg.src.x - lat_dx);
            temp.set('y', seg.src.y - lat_dy);
            points.push(temp);

            temp = new Map();
            temp.set('x', dx - lat_dx);
            temp.set('y', dy - lat_dy);
            points.push(temp);
        }

        else{
            let d = (this.object.width / 2.0) - (lane * this.object.get_lane_width());

            let ret = delta_pt_in_perp_line(seg.src.x, seg.src.y, seg.dst.x, seg.dst.y, d);
            let lat_px = ret[0];
            let lat_py = ret[1];

            let temp = new Map();
            temp.set('x', seg.src.x - lat_px);
            temp.set('y', seg.src.y - lat_py);
            points.push(temp);

            temp = new Map();
            temp.set('x', seg.dst.x - lat_px);
            temp.set('y', seg.dst.y - lat_py);
            points.push(temp);
        }

        for(let point of points){
            point.set('x', point.get('x') * this.gc.zoom_level);
            point.set('y', point.get('y') * this.gc.zoom_level);
        }

        return points;
    }

    _move_lane_markings(){
        let ctr = 0;
        let first = this.object.segments.segments[0];
        let last = this.object.segments.segments[this.object.segments.segments.length-1];

        for(let seg of this.object.segments.segments){
            for(let lane=1; lane<this.object.get_lanes(); lane++){

                let points = this._get_lane_marking_points(seg, lane, first, last);
                let line = d3.line()
                    .x(function(d){ return d.get('x')})
                    .y(function(d){ return d.get('y') });
                this.lane_markings[ctr].attr("d", line(points));
                ctr += 1;
            }
        }
    }

    _draw_lanes(){
        let first = this.object.segments.segments[0];
        let last = this.object.segments.segments[this.object.segments.segments.length-1];

        for(let seg of this.object.segments.segments){
            for(let lane=1; lane<this.object.get_lanes(); lane++){

                let points = this._get_lane_marking_points(seg, lane, first, last);
                let m = this.gc.create_line('lane_marking', points, null, null, 0.5, null, LANE_MARKING_STROKE, true);
                this.lane_markings.push(m);
            }
        }
    }

    _clear_lanes(){
        for(let lane_marking of this.lane_markings){
            this.gc.delete_(lane_marking);
        }
        this.lane_markings = [];
    }
}