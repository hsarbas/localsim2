
function* random_event_generator(distribution, limit=null){
    if(!distribution){
        throw 'ValueError';
    }

    let keys_iter = distribution.keys();
    let val_iter = distribution.values();
    let events = [];
    let probabilities = [];

    for(let ctr=0; ctr<distribution.size; ctr++){
        events.push(keys_iter.next().value);
        probabilities.push(val_iter.next().value);
    }

    let no_events = events.length;

    let cum_sum = [];

    for(let ctr=0; ctr<no_events; ctr++){
        var s = 0;
        for(let i=0; i<ctr+1; i++){
            s += probabilities[i];
        }
        cum_sum.push(s);
    }

    let ranges = new Map();
    for(let ctr=0; ctr<events.length; ctr++){
        let event = events[ctr];
        if(ctr == 0){
            ranges.set(event, [0.0, cum_sum[ctr]]);
        }
        else{
            ranges.set(event, [cum_sum[ctr-1], cum_sum[ctr]]);
        }
    }

    while(true){
        let rand = parseFloat(Math.random().toFixed(4));
        let entries_iter = ranges.entries();
        let items = [];
        for(let ctr=0; ctr<ranges.size; ctr++){
            items.push(entries_iter.next().value);
        }

        for(let ctr=0; ctr<items.length; ctr++){
            let key = items[ctr][0];
            let value = items[ctr][1];

            let lower = value[0];
            let upper = value[1];

            if(lower <= rand < upper){
                yield key;
                break;
            }
        }

        if(limit != null){
            if(limit <= 0){
                break;
            }
            else{
                limit -= 1;
            }
        }
    }
}