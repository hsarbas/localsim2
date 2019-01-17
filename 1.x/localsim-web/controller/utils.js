function point_to_segment(obj, x, y){
    for(let ctr=0; ctr<obj.segments.segments.length; ctr++){
        let segment = obj.segments.segments[ctr];

        let ret = orthogonal_projection(segment.src.x, segment.src.y, x, y, segment.dx, segment.dy);
        let rx = ret[0];
        let ry = ret[1];
        let da = distance([rx - segment.src.x, ry - segment.src.y]);
        let db = distance([segment.dst.x - rx, segment.dst.y - ry]);

        if(almost_equal(da + db, segment.get_length(), 0.001)){
            return segment;
        }
    }
    return null;
}


function point_to_lane(obj, x, y){
    let segment = point_to_segment(obj, x, y);
    let ax = null;
    let ay = null;
    let dx = null;
    let dy = null;
    let ret = null;
    let _allowed = obj.get_lanes() - 1;

    if(obj.constructor.name == 'Interrupted_Road'){
        let keys = obj.in_matrix.keys();
        let values = obj.out_matrix.values();
        let src_road = [];
        let dst_road = [];

        for(let ctr=0; ctr<obj.in_matrix.size; ctr++){
            src_road.push(keys.next().value);
        }
        for(let ctr=0; ctr<obj.out_matrix.size; ctr++){
            dst_road.push(values.next().value);
        }

        let src_mid = (src_road[0] + src_road[src_road.length-1] + 1) / 2.0;
        let dst_mid = (dst_road[0] + dst_road[dst_road.length-1] + 1) / 2.0;

        ret = delta_pt_in_perp_line(obj.src_road.src.x, obj.src_road.src.y, obj.src_road.dst.y, obj.src_road.dst.y,
            (-obj.src_road.get_lanes() / 2.0 + src_mid) * obj.get_lane_width());
        let smx = ret[0];
        let smy = ret[1];

        ret = delta_pt_in_perp_line(obj.dst_road.src.x, obj.dst_road.src.y, obj.dst_road.dst.x, obj.dst_road.dst.y,
            (-obj.dst_road.get_lanes() / 2.0 + dst_mid) * obj.get_lane_width());
        let dmx = ret[0];
        let dmy = ret[1];

        smx = smx + obj.src_road.dst.x;
        smy = smy + obj.src_road.dst.y;
        dmx = dmx + obj.dst_road.src.x;
        dmy = dmy + obj.dst_road.src.y;

        if(obj.segments.segments[0] == obj.segments.segments[obj.segments.segments.length-1]){
            ret = delta_pt_in_perp_line(smx, smy, dmx, dmy, obj.width/2.0);
            dx = ret[0];
            dy = ret[1];
            ax = smx - dx;
            ay = smy - dy;
        }
        else if(segment == obj.segments.segments[0]){
            ret = delta_pt_in_perp_line(smx, smy, segment.dst.x, segment.dst.y, obj.width/2.0);
            dx = ret[0];
            dy = ret[1];
            ax = smx - dx;
            ay = smy - dy;
        }
        else if(segment == obj.segments.segments[obj.segments.segments.length-1]){
            ret = delta_pt_in_perp_line(segment.src.x, segment.src.y, dmx, dmy, obj.width/2.0);
            dx = ret[0];
            dy = ret[1];
            ax = segment.src.x - dx;
            ay = segment.src.y - dy;
        }
        else{
            ret = delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y, obj.width/2.0);
            dx = ret[0];
            dy = ret[1];
            ax = segment.src.x - dx;
            ay = segment.src.y - dy;
        }
    }
    else{
        ret = delta_pt_in_perp_line(segment.src.x, segment.src.y, segment.dst.x, segment.dst.y, obj.width/2.0);
        dx = ret[0];
        dy = ret[1];
        ax = segment.src.x - dx;
        ay = segment.src.y - dy;
    }

    ret = orthogonal_projection(ax, ay, x, y, segment.dx, segment.dy);
    let xp = ret[0];
    let yp = ret[1];
    let dist = distance([x - xp, y - yp]);
    let lane = Math.floor(dist / obj.get_lane_width());

    if(lane > _allowed){
        return _allowed;
    }
    return lane;
}


function point_to_dist(obj, x, y){

    let pos = 0;

    for(let ctr=0; ctr<obj.segments.segments.length; ctr++){
        let segment = obj.segments.segments[ctr];
        let ret = orthogonal_projection(segment.src.x, segment.src.y, x, y, segment.dx, segment.dy);
        let rx = ret[0];
        let ry = ret[1];

        let da = distance([rx - segment.src.x, ry - segment.src.y]);
        let db = distance([segment.dst.x - rx, segment.dst.y - ry]);

        if(almost_equal(da + db, segment.get_length(), 0.001)){
            pos += distance([rx - segment.src.x, ry - segment.src.y]);
            break;
        }
        pos += segment.get_length();
    }
    return pos;
}

function dist_to_segment(obj, dist){
    for(let ctr=0; ctr<obj.segments.segments.length; ctr++){
        let segment = obj.segments.segments[ctr];
        dist -= segment.get_length();
        if(dist <= 0){
            return segment;
        }
    }
    return null;
}

function map_to_obj(map){

    let obj = {};
    map.forEach ((v,k) => { obj[k] = v });
    return obj;
}
