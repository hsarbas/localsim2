/**
 * Created by Sam on 3/29/2017.
 */

function* count() {
    let index = 0;
    while(true)
        yield index++;
}