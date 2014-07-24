var virtualpointer = function() { 
    "use strict";

    // some default values for running events
    var mouse_position          = {x: 1, y: 1},
        event_queue             = [],
        default_interval        = 20,
        first_event_offset      = 50,
        default_flick_duration  = 200,
        default_click_duration  = Math.random() * (250 - 20) + 20,
        default_screen_x_offset = 1,
        default_screen_y_offset = 30;

    // function to dispatch event inside the browser
    function send_event(type, clientX, clientY, element, button, screenX, screenY, is_touch_event) {
        // calculate screenX and screenY if not provided
        if (!screenX) { 
            screenX = clientX + default_screen_x_offset; 
        }
        if (!screenY) {
            screenY = clientY + default_screen_y_offset;
        }

        // if button is not specified, assume the button is the left mouse button
        if (!button && ( type === 'click' || type === 'mousedown' || type === 'mouseup') ) {
            button = 0; // left button is default
            // TODO: handle IE8 where left button = 0
        }

        // detail is the value for # of times this element has been clicked, set it to 1 when doing click events
        var detail = (type !== 'mousemove' && type !== 'touchmove') ? 1 : 0;

        // construct new event object, either touch or mouse event
        if (is_touch_event && 
             ( ('ontouchstart' in window) || (navigator.msMaxTouchPoints > 0) ) 
           ) {

            var eventObject = document.createEvent("TouchEvent");
            eventObject.initTouchEvent(type,  true, true, window, detail, screenX, screenY, clientX, clientY, false, false, false, false, button, null);
        } else {
            var eventObject = document.createEvent("MouseEvent");
            eventObject.initMouseEvent(type,  true, true, window, detail, screenX, screenY, clientX, clientY, false, false, false, false, button, null);   
        }
        // if element specified, fire event on the element object
        if (element) {
            element.dispatchEvent(eventObject);
        // otherwise fire event on document.body
        } else {
            document.body.dispatchEvent(eventObject);
        }

        mouse_position = {x: screenX, y: screenY};
    }

    // processes event stack
    function process_event_queue() {
        if (event_queue.length) {
            var current_event = event_queue[0],
                next_event    = event_queue[1];

            send_event(current_event.type, current_event.pageX, current_event.pageY, current_event.target, null, current_event.screenX, current_event.screenY, current_event.is_touch_event);

            if (next_event) {
                var offset = next_event.timestamp - current_event.timestamp;
                setTimeout(process_event_queue, offset);
            }
            event_queue.shift();
        }
    }

    function get_offset_of_element(element) {
        // calculate position of element
        var body_rect = document.body.getBoundingClientRect(),
            elem_rect = element.getBoundingClientRect(),
            y_offset  = elem_rect.top - body_rect.top,
            x_offset  = elem_rect.left - body_rect.left;

        // return values
        return {x: x_offset, y: y_offset};
    }

    // constructs mouse movement stack to move mouse to an element over a set amount of time
    function build_mouse_movement_queue(element, duration, is_mobile) {
        // calculate position of element
        var element_offset = get_offset_of_element(element);

        // calculate distance
        var x_distance = element_offset.x - mouse_position.x,
            y_distance = element_offset.y - mouse_position.y;

        // determine number of increments
        var increments = duration / default_interval; // divide number of milliseconds for duration by 20, since we want to send events every 20ish milliseconds
        for (var i = 1; i <= increments; i++) {
            var new_x_pos = Math.round(x_distance / increments * i) + mouse_position.x,
                new_y_pos = Math.round(y_distance / increments * i) + mouse_position.y;

            event_queue.push({
                                type:           "mousemove",
                                pageX:          new_x_pos, 
                                pageY:          new_y_pos, 
                                screenX:        new_x_pos + default_screen_x_offset, 
                                screenY:        new_y_pos + default_screen_y_offset,  
                                timestamp:      i * default_interval
                            });
        }
        
    }

    // construct click event stack to click on an element
    function build_click_event_queue(element, duration, is_mobile) {
        // calculate position of element
        var element_offset = get_offset_of_element(element);

        // get timestamp of last event in queue
        var last_timestamp = (event_queue.length) ? event_queue[event_queue.length - 1].timestamp : 0;

        if (!duration) {
            duration = default_click_duration;
        }
        var touch_event = (is_mobile) ? true : false;

        // mobile events are different (touchstart)
        if (is_mobile) {

            event_queue.push({
                                type:           "touchstart", 
                                pageX:          element_offset.x, 
                                pageY:          element_offset.y, 
                                screenX:        element_offset.x, 
                                screenY:        element_offset.y, 
                                timestamp:      last_timestamp, 
                                target:         element, 
                                is_touch_event: touch_event
                            });

            event_queue.push({
                                type:           "touchend", 
                                pageX:          element_offset.x, 
                                pageY:          element_offset.y, 
                                screenX:        element_offset.x, 
                                screenY:        element_offset.y, 
                                timestamp:      last_timestamp + default_click_duration, 
                                target:         element, 
                                is_touch_event: touch_event
                            });
            
            event_queue.push({
                                type:           "click", 
                                pageX:          element_offset.x, 
                                pageY:          element_offset.y, 
                                screenX:        element_offset.x,
                                screenY:        element_offset.y,
                                timestamp:      last_timestamp + default_click_duration + 10, 
                                target:         element, 
                                is_touch_event: touch_event
                            });

        } else {

            event_queue.push({
                                type:           "mousedown", 
                                pageX:          element_offset.x, 
                                pageY:          element_offset.y, 
                                screenX:        element_offset.x + default_screen_x_offset, 
                                screenY:        element_offset.y + default_screen_y_offset, 
                                timestamp:      last_timestamp, 
                                target:         element, 
                                is_touch_event: touch_event
                            });

            event_queue.push({
                                type:           "mouseup", 
                                pageX:          element_offset.x, 
                                pageY:          element_offset.y, 
                                screenX:        element_offset.x + default_screen_x_offset, 
                                screenY:        element_offset.y + default_screen_y_offset, 
                                timestamp:      last_timestamp + default_click_duration, 
                                target:         element, 
                                is_touch_event: touch_event
                            });

            event_queue.push({
                                type:           "click", 
                                pageX:          element_offset.x, 
                                pageY:          element_offset.y, 
                                screenX:        element_offset.x + default_screen_x_offset, 
                                screenY:        element_offset.y + default_screen_y_offset, 
                                timestamp:      last_timestamp + default_click_duration + 10, 
                                target:         element, 
                                is_touch_event: touch_event
                            });

        }

    }

    // move screen to element with correct touch events, as in mobile or tablet browser
    function build_flick_event_queue(element, duration) {
        // calculate position of element
        var body_rect = document.body.getBoundingClientRect(),
            elem_rect = element.getBoundingClientRect(),
            y_offset  = elem_rect.top - body_rect.top,
            x_offset  = elem_rect.left - body_rect.left;

        // calculate distance
        var x_distance = x_offset - mouse_position.x,
            y_distance = y_offset - mouse_position.y;

        if (!duration) duration = default_flick_duration;

        event_queue.push({
                            type:           "touchstart", 
                            pageX:          mouse_position.x, 
                            pageY:          mouse_position.y, 
                            screenX:        mouse_position.x, 
                            screenY:        mouse_position.y, 
                            timestamp:      0, 
                            target:         element, 
                            is_touch_event: true
                        });

        // determine number of increments
        var increments = duration / default_interval; // divide number of milliseconds for duration by 20, since we want to send events every 20ish milliseconds
        for (var i = 1; i <= increments; i++) {
            var new_x_pos = Math.round(x_distance / increments * i) + mouse_position.x,
                new_y_pos = Math.round(y_distance / increments * i) + mouse_position.y;

            event_queue.push({
                                type:           "touchmove", 
                                pageX:          new_x_pos, 
                                pageY:          new_y_pos, 
                                screenX:        new_x_pos, 
                                screenY:        new_y_pos, 
                                timestamp:      i * default_interval, 
                                target:         element, 
                                is_touch_event: true
                            });
        }

        // get timestamp of last event in queue
        var last_timestamp = (event_queue.length) ? event_queue[event_queue.length - 1].timestamp : 0;

        event_queue.push({
                            type:           "touchend", 
                            pageX:          x_offset, 
                            pageY:          y_offset, 
                            screenX:        x_offset, 
                            screenY:        y_offset, 
                            timestamp:      last_timestamp, 
                            target:         element, 
                            is_touch_event: true
                        });
    }

    // function to begin execution of events inside event_queue
    function start_processing_events() {
        setTimeout(process_event_queue, first_event_offset);
    }

    // exposed functions that can be valled using virtualpointer.function_name();
    return {
        move_mouse_to_element: function(element, duration) {
            if (!element) return;
            
            build_mouse_movement_queue(element, duration);
            start_processing_events();
        },
        click_element: function(element) {
            if (!element) return;

            build_click_event_queue(element);
            start_processing_events();
        },
        move_to_element_and_click: function(element, duration) {
            if (!element) return;

            build_mouse_movement_queue(element, duration);
            build_click_event_queue(element);
            start_processing_events();
        },
        tap_element: function(element) {
            if (!element) return;

            build_click_event_queue(element, null, true);
            start_processing_events();
        },
        double_tap_element: function(element) {
            if (!element) return;

            build_click_event_queue(element, null, true);
            build_click_event_queue(element, 25, true);
            start_processing_events();
        },
        flick_to_element: function(element, duration) {
            if (!element) return;

            build_flick_event_queue(element, duration);
            start_processing_events();
        },
        // used for executing a serialized set of JSON events
        run_serialized_events: function(events) {
            if (!events || ! events instanceof Array) return;

            event_queue = events;
            start_processing_events();
        }
    }
}();
