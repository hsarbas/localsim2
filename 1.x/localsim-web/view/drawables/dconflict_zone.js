class DConflictArea{

    constructor(gc, conflict, segments){
        this.gc = gc;
        this.object = conflict;
        this.item = null;
        this.segments = segments;

        this.object.connect_to_all(this, this.responder);
        this.draw();
        this.move();
    }

    responder(event, source){
        if(event == 'move'){
            this.move();
        }
        else if(event == 'destroy'){
            this.destroy();
        }
        else if(event == 'change'){
            this._recolor();
        }
    }

    move(){
        if(!this.object){
            throw ReferenceError;
        }
        this._update_segments();
        let points = this._draw_points();

        let line = d3.line()
            .x(function(d){ return d.get('x')})
            .y(function(d){ return d.get('y')});

        this.item.attr("d", line(points));
    }

    draw(){
        let points = this._draw_points();
        let priority = this.object.road.get_priority();
        let fill = '';
        let stroke = '';
        if(priority == 'minor' || priority == 0){
            stroke = MINOR_CONFLICT;
            fill = stroke;
        }
        else if(priority == 'major' || priority == 1){
            stroke = MAJOR_CONFLICT;
            fill = stroke;
        }

        this.item = this.gc.create_line(this, points, null, null, 1, fill, stroke, true);
    }

    _recolor(){
        let stroke = '';
        let fill = '';
        if(this.object.road.get_priority() == 'minor'){
            stroke = MINOR_CONFLICT;
            fill = stroke;
        }
        else if(this.object.road.get_priority() == 'major'){
            stroke = MAJOR_CONFLICT;
            fill = stroke;
        }
        this.item.style('stroke', stroke);
        this.item.attr('fill', fill);
    }

    _draw_points(){
        let points = [];
        let marker = true;
        let road = this.object.road;
        let segments = this.segments;
        let start = this.object.pos;
        let end = this.object.exit;
        let first = this.segments[0];
        let last = this.segments[this.segments.length-1];
        let inner = this.object.lane;
        let outer = this.object.zone;
        let sx = null;
        let sy = null;
        let dx = null;
        let dy = null;

        for(let segment of road.segments.segments){
            if(segment == last){
                break;
            }
            if(segment ==first){
                marker = false;
            }
            if(marker){
                start -= segment.get_length();
            }
            end -= segment.get_length();
        }
        let dist = (road.width / 2.0) - (inner * road.get_lane_width());

        if(first == road.segments.segments[0]){
            let key_iter = road.in_matrix.keys();
            let keys = [];
            for(let ctr=0; ctr<road.in_matrix.size; ctr++){
                keys.push(key_iter.next().value);
            }

            let ret = this.trans_node(road.src_road.segments.segments[road.src_road.segments.segments.length-1],
                (keys[keys.length-1]+keys[0])/2.0, road.src_road.width, road.src_road.get_lane_width());
            let px = ret[0];
            let py = ret[1];

            sx = first.src.x + px;
            sy = first.src.y + py;
        }
        else{
            sx = first.src.x;
            sy = first.src.y;
        }
        let ret = delta_pt_in_line(sx, sy, first.dst.x, first.dst.y, start);
        let long_sx = ret[0];
        let long_sy = ret[1];

        ret = delta_pt_in_perp_line(sx, sy, first.dst.x, first.dst.y, dist);
        let lat_sx = ret[0];
        let lat_sy = ret[1];

        if(last == road.segments.segments[road.segments.segments.length-1]){
            let val_iter = road.out_matrix.values();
            let values = [];
            for(let ctr=0; ctr<road.out_matrix.size; ctr++){
                values.push(val_iter.next().value);
            }

            ret = this.trans_node(road.dst_road.segments.segments[road.dst_road.segments.segments.length-1],
                (values[values.length-1]+values[0])/2.0, road.dst_road.width, road.dst_road.get_lane_width());
            let px = ret[0];
            let py = ret[1];
            dx = last.dst.x + px;
            dy = last.dst.y + py;
        }
        else{
            dx = last.dst.x;
            dy = last.dst.y;
        }
        ret = delta_pt_in_line(last.src.x, last.src.y, dx, dy, end);
        let long_dx = ret[0];
        let long_dy = ret[1];

        ret = delta_pt_in_perp_line(last.src.x, last.src.y, dx, dy, dist);
        let lat_dx = ret[0];
        let lat_dy = ret[1];

        let temp = null;
        for(let ctr=0; ctr<segments.length; ctr++){
            let segment = segments[ctr];
            if(segment == first){
                temp = new Map();
                temp.set('x', sx + long_sx - lat_sx);
                temp.set('y', sy + long_sy - lat_sy);
                points.push(temp);
                if(segments.length == 2){
                    temp = new Map();
                    temp.set('x', segment.dst.x - lat_sx);
                    temp.set('y', segment.dst.y - lat_sy);
                    points.push(temp);
                }
            }
            if(segment != first && segment != last){
                ret = delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y,
                    (road.width / 2.0) - (inner * road.get_lane_width()));
                let tx = ret[0];
                let ty = ret[1];

                temp = new Map();
                temp.set('x', segment.src.x - tx);
                temp.set('y', segment.src.y - ty);
                points.push(temp);

                temp = new Map();
                temp.set('x', segment.dst.x - tx);
                temp.set('y', segment.dst.y - ty);
                points.push(temp);
            }
            if(segment == last){
                temp = new Map();
                temp.set('x', segment.src.x + long_dx - lat_dx);
                temp.set('y', segment.src.y + long_dy - lat_dy);
                points.push(temp);
            }
        }

        dist = (road.width / 2.0) - ((outer + 1) * road.get_lane_width());
        ret = delta_pt_in_perp_line(first.src.x, first.src.y, first.dst.x, first.dst.y, dist);
        lat_sx = ret[0];
        lat_sy = ret[1];
        ret = delta_pt_in_perp_line(last.src.x, last.src.y, last.dst.x, last.dst.y, dist);
        lat_dx = ret[0];
        lat_dy = ret[1];


        let reversed = [];
        for(let _seg of this.segments){
            reversed.unshift(_seg);
        }
        for(let segment of reversed){
            if(segment == last){
                temp = new Map();
                temp.set('x', segment.src.x + long_dx - lat_dx);
                temp.set('y', segment.src.y + long_dy - lat_dy);
                points.push(temp);
            }
            if(segment != first && segment != last){
                ret = delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y,
                    (road.width / 2.0) - ((outer + 1) * road.get_lane_width()));
                let tx = ret[0];
                let ty = ret[1];

                temp = new Map();
                temp.set('x', segment.dst.x - tx);
                temp.set('y', segment.dst.y - ty);
                points.push(temp);

                temp = new Map();
                temp.set('x', segment.src.x - tx);
                temp.set('y', segment.src.y - ty);
                points.push(temp);
            }
            if(segment == first){
                if(segments.length == 2){
                    temp = new Map();
                    temp.set('x', segment.dst.x - lat_sx);
                    temp.set('y', segment.dst.y - lat_sy);
                    points.push(temp);
                }
                temp = new Map();
                temp.set('x', sx + long_sx - lat_sx);
                temp.set('y', sy + long_sy - lat_sy);
                points.push(temp);
            }
        }
        temp = new Map();
        temp.set('x', points[0].get('x'));
        temp.set('y', points[0].get('y'));
        points.push(temp);

        for(let ctr=0; ctr<points.length; ctr++){
            let point = points[ctr];
            point.set('x', point.get('x') * this.gc.zoom_level);
            point.set('y', point.get('y') * this.gc.zoom_level);
        }
        return points;
    }

    _update_segments(){
        let pos = this.object.pos;
        let zone = this.object.exit;
        this.segments = [];
        let get_segments = false;

        for(let ctr=0; ctr<this.object.road.segments.segments.length; ctr++){
            let segment = this.object.road.segments.segments[ctr];

            if(pos - segment.get_length() <= 0){
                get_segments = true;
            }
            if(get_segments){
                this.segments.push(segment);
            }
            if(zone - segment.get_length() <= 0){
                break;
            }
            pos -= segment.get_length();
            zone -= segment.get_length();
        }
    }

    trans_node(segment, lane, width, lane_width){
        return delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y,
            lane * lane_width + (lane_width - width)/2.0);

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