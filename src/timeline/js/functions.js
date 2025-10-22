/**
 * @file
 * @brief Misc Functions used by the OpenShot Timeline
 * @author Jonathan Thomas <jonathan@openshot.org>
 * @author Cody Parker <cody@yourcodepro.com>
 *
 * @section LICENSE
 *
 * Copyright (c) 2008-2018 OpenShot Studios, LLC
 * <http://www.openshotstudios.com/>. This file is part of
 * OpenShot Video Editor, an open-source project dedicated to
 * delivering high quality video editing and animation solutions to the
 * world. For more information visit <http://www.openshot.org/>.
 *
 * OpenShot Video Editor is free software: you can redistribute it
 * and/or modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation, either version 3 of the
 * License, or (at your option) any later version.
 *
 * OpenShot Video Editor is distributed in the hope that it will be
 * useful, but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with OpenShot Library.  If not, see <http://www.gnu.org/licenses/>.
 */

/*global bounding_box, global_primes, timeline*/

// Generate a UUID
function uuidv4() {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
  );
}

// Find a JSON element / object with a particular value in the json data
function findElement(arr, propName, propValue) {
  // Loop through array looking for a matching element
  for (var i = 0; i < arr.length; i++) {
    if (arr[i][propName] === propValue) {
      return arr[i];
    }
  }

}

// Get the height of the track container (minus bottom margin of last track)
function getTrackContainerHeight() {

  var track_margin = 0;
  var track_object = $(".track");
  if (track_object.length) {
    if (track_object.css("margin-bottom")) {
      track_margin = parseInt(track_object.css("margin-bottom").replace("px", ""), 10);
    }
  }

  return $("#track-container").height() - track_margin;
}

// Draw each bar of the audio waveform (a wave is made up from lots of vertical lines)
function drawBar(ctx, startX, endX, maxHeight, avgHeight, transpColor, fillColor, bottom_edge) {
  // Draw the slightly transparent max-bar
  ctx.fillStyle = transpColor;
  ctx.fillRect(startX, bottom_edge - maxHeight, endX - startX, maxHeight);

  // Draw the fully visible average-bar
  ctx.fillStyle = fillColor;
  ctx.fillRect(startX, bottom_edge - avgHeight, endX - startX, avgHeight);
}

// Draw audio waveform from audio samples
function drawWaveform(ctx, audio_data, start_sample, end_sample, sample_divisor, block_width, scale, color, color_transp, bottom_edge) {
  var last_x = 0;
  var avg = 0;
  var avg_cnt = 0;
  var max = 0;

  // Loop through audio samples (calculate average and max amplitude)
  for (var i = start_sample; i < end_sample; i++) {
    var sample = Math.abs(audio_data[i]);
    var x = Math.floor((i + 1 - start_sample) / sample_divisor);
    avg += sample;
    avg_cnt++;
    max = Math.max(max, sample);

    if (x >= last_x + block_width || i === end_sample - 1) {
      drawBar(ctx, last_x, x, max * scale, avg / avg_cnt * scale, color_transp, color, bottom_edge);

      // Reset for the next bar
      last_x = x;
      avg = 0;
      avg_cnt = 0;
      max = 0;
    }
  }
}


// Draw the audio waveform for a clip
function drawAudio(scope, clip_id) {
  // Find clip in scope
  var clip = findElement(scope.project.clips, "id", clip_id);
  if (!clip.ui || !clip.ui.audio_data) {
    return;
  }

  // Find audio canvas
  var element = $("#clip_" + clip_id);
  var audio_canvas = element.find(".audio");
  if (audio_canvas.length === 0) {
    return;
  }

  // Init canvas and init variables
  var ctx = audio_canvas[0].getContext("2d");
  var samples_per_second = 20;
  var start_sample = Math.round(clip.start * samples_per_second);
  var end_sample = Math.round(clip.end * samples_per_second);
  var sample_divisor = samples_per_second / scope.pixelsPerSecond;
  var block_width = 2;
  var color = "#2a82da"; // rgb(42,130,218)
  var color_transp = "rgba(42,130,218,0.5)";
  ctx.strokeStyle = color;

  // Scale waveform to smaller % of clip height
  var bottom_edge = audio_canvas.height();
  var scale = bottom_edge * 0.85;

  drawWaveform(ctx, clip.ui.audio_data, start_sample, end_sample, sample_divisor, block_width, scale, color, color_transp, bottom_edge);
}

function padNumber(value, pad_length) {
  return ("10000" + value).slice(-1 * pad_length);
}

// Convert seconds into formatted time stamp
function secondsToTime(secs, fps_num, fps_den) {
  // calculate time of playhead
  var milliseconds = secs * 1000;
  var sec = Math.floor(milliseconds / 1000);
  var milli = milliseconds % 1000;
  var min = Math.floor(sec / 60);
  sec = sec % 60;
  var hour = Math.floor(min / 60);
  min = min % 60;
  var day = Math.floor(hour / 24);
  hour = hour % 24;
  var week = Math.floor(day / 7);
  day = day % 7;

  var frame = Math.round((milli / 1000.0) * (fps_num / fps_den)) + 1;
  return {
    "week": padNumber(week, 2),
    "day": padNumber(day, 2),
    "hour": padNumber(hour, 2),
    "min": padNumber(min, 2),
    "sec": padNumber(sec, 2),
    "milli": padNumber(milli, 2),
    "frame": padNumber(frame, 2)
  };
}

// Find the closest track number (based on a Y coordinate)
function findTrackAtLocation(scope, mouseY) {
  var closestTrack = null;
  var minDistance = Infinity;

  // Loop through each layer (looking for the closest track based on Y coordinate)
  for (var layer_index = 0; layer_index < scope.project.layers.length; layer_index++) {
    var layer = scope.project.layers[layer_index];

    // Consider only unlocked tracks
    if (!layer.lock) {
      // Assuming each layer has a height property
      var layerCenterY = layer.y + (layer.height / 2);
      var distance = Math.abs(mouseY - layerCenterY);

      // Update if this layer is closer than the previous closest
      if (distance < minDistance) {
        minDistance = distance;
        closestTrack = layer;
      }
    }
  }

  return closestTrack;
}


// Find the closest track number (based on a Y coordinate)
function hasLockedTrack(scope, top, bottom) {

  // Loop through each layer (looking for the closest track based on Y coordinate)
  for (var layer_index = scope.project.layers.length - 1; layer_index >= 0; layer_index--) {
    var layer = scope.project.layers[layer_index];

    // Compare position of track to Y param
    if (layer.lock && layer.y >= top && layer.y <= bottom) {
      // Yes, found a locked track inside these coordinates
      return true;
    }
  }

  return false;
}

var bounding_box = Object();

// Build bounding box (since multiple items can be selected)
function setBoundingBox(scope, item, item_type="clip") {
  let scrolling_tracks = $("#scrolling_tracks");
  let vert_scroll_offset = scrolling_tracks.scrollTop();
  let horz_scroll_offset = scrolling_tracks.scrollLeft();
  let item_bottom = 0;
  let item_top = 0;
  let item_left = 0;
  let item_right = 0;
  let item_width = 1;

  if (item && item.position()) {
    // Look up item by ID in scope
    let item_id = item.attr("id").replace("clip_", "").replace("transition_", "");
    let item_object = null;
    if (item.hasClass("clip")) {
      item_object = findElement(scope.project.clips, "id", item_id);
    }
    else if (item.hasClass("transition")) {
      item_object = findElement(scope.project.effects, "id", item_id);
    }

    // Compute width from `time` duration (for more accuracy). Getting the width from
    // JQuery is not accurate, and is occasionally rounded.
    let item_width = 1;
    if (item_object) {
        item_width = (item_object.end - item_object.start) * scope.pixelsPerSecond;
    } else {
        item_width = item.width();
    }

    item_bottom = item.position().top + item.height() + vert_scroll_offset;
    item_top = item.position().top + vert_scroll_offset;
    item_left = item.position().left + horz_scroll_offset;
    item_right = item.position().left + horz_scroll_offset + item_width;
  } else {
    // Protect against invalid item (sentry)
    // TODO: Determine what causes an invalid item to be passed into this function
    return;
  }

  if (jQuery.isEmptyObject(bounding_box)) {
    bounding_box.left = item_left;
    bounding_box.top = item_top;
    bounding_box.bottom = item_bottom;
    bounding_box.right = item_right;
    bounding_box.height = item.height();
    bounding_box.width = item_width;
  } else {
    //compare and change if item is a better fit for bounding box edges
    if (item_top < bounding_box.top) { bounding_box.top = item_top; }
    if (item_left < bounding_box.left) { bounding_box.left = item_left; }
    if (item_bottom > bounding_box.bottom) { bounding_box.bottom = item_bottom; }
    if (item_right > bounding_box.right) { bounding_box.right = item_right; }

    // compare height and width of bounding box (take the largest number)
    let height = bounding_box.bottom - bounding_box.top;
    let width = bounding_box.right - bounding_box.left;
    if (height > bounding_box.height) { bounding_box.height = height; }
    if (width > bounding_box.width) { bounding_box.width = width; }
  }

  // Add in additional types of special-case bounding boxes
  if (item_type === "playhead") {
      // Center of playhead (1 pixel width)
      bounding_box.left += 13;
      bounding_box.right = bounding_box.left;
      bounding_box.width = 1;

  } else if (item_type === "trimming") {
      // Edge of clip for trimming (1 pixel width)
      bounding_box.right = bounding_box.left;
      bounding_box.width = 1;
  }

  // Get list of current selected ids (so we can ignore their snapping x coordinates)
  // Unless playhead mode, where we don't want to ignore any selected clips
  bounding_box.selected_ids = {};
  if (item_type !== "playhead") {
    for (let clip_index = 0; clip_index < scope.project.clips.length; clip_index++) {
      if (scope.project.clips[clip_index].selected) {
        bounding_box.selected_ids[scope.project.clips[clip_index].id] = true;
      }
    }
    for (let effect_index = 0; effect_index < scope.project.effects.length; effect_index++) {
      if (scope.project.effects[effect_index].selected) {
        bounding_box.selected_ids[scope.project.effects[effect_index].id] = true;
      }
    }
  } else {
    // Get id of ruler, or trimming clip
    let id = item.attr("id").replace("clip_", "").replace("transition_", "");
    bounding_box.selected_ids[id] = true;
  }
}

// Convert pixel positions to time (in seconds)
function pixelToTime(scope, pixelPosition) {
    return pixelPosition / scope.pixelsPerSecond;  // Convert from pixel to time
}

// Function to snap time (in seconds) to the nearest frame boundary based on FPS
function snapToFPSGridTime(scope, timePosition) {
    const fps_num = scope.project.fps.num;
    const fps_den = scope.project.fps.den;

    // Frames per second (including fractional frame rates like 29.97)
    const fps = fps_num / fps_den;

    // Snap time to the nearest frame boundary (frames = time * fps)
    return Math.round(timePosition * fps) / fps;
}

// Move bounding box (apply snapping and constraints)
function moveBoundingBox(scope, previous_x, previous_y, x_offset, y_offset, left, top, item_type="clip", cursor_offset= {top: 0}) {
  let scrolling_tracks = $("#scrolling_tracks");

  // Store result of snapping logic (left, top)
  var snapping_result = Object();
  snapping_result.left = left;
  snapping_result.top = top;

  // Check for shift key
  if (typeof(event) !== "undefined" && event.shiftKey && item_type === "clip") {
    // freeze X movement for clips and transitions
    x_offset = 0;
    snapping_result.left = previous_x;
  }

  // Update bounding box
  bounding_box.left += x_offset;
  bounding_box.right += x_offset;
  bounding_box.top += y_offset;
  bounding_box.bottom += y_offset;

  // Find closest nearby object, if any (for snapping)
  var results = scope.getNearbyPosition([bounding_box.left, bounding_box.right], 10.0, bounding_box.selected_ids);
  var nearby_offset = results[0];
  var snapline_position = results[1];

  if (snapline_position) {
    // Show snapping line
    if (item_type !== "playhead") {
      scope.showSnapline(snapline_position);
    }

    if (scope.enable_snapping) {
      // Snap bounding box to this position
      x_offset -= nearby_offset;
      bounding_box.left -= nearby_offset;
      bounding_box.right -= nearby_offset;
      snapping_result.left -= nearby_offset;
    }

  } else {
    // Hide snapline
    scope.hideSnapline();
  }

  // Find the nearest track based on the adjusted top position
  var nearest_track = findTrackAtLocation(scope, bounding_box.top + cursor_offset.top);
  if (nearest_track !== null) {
    var track_offset = nearest_track.y - bounding_box.top;

    // Snap bounding box to nearest track
    y_offset += track_offset;
    bounding_box.top += track_offset;
    bounding_box.bottom += track_offset;
    snapping_result.top += track_offset;
  }

  // Find bottom track (for accurate bottom bounding box detection)
  var lastTrack = scrolling_tracks.find(".track").last();
  var bottom_edge_last_track = 0;
  if (lastTrack.length) {
    bottom_edge_last_track = lastTrack.position().top + lastTrack.height() + scrolling_tracks.scrollTop();
  }

  // Check overall timeline constraints (i.e don't let clips be dragged outside the timeline)
  if (bounding_box.left < 0) {
    // Left border
    x_offset -= bounding_box.left;
    bounding_box.left = 0;
    bounding_box.right = bounding_box.width;
    snapping_result.left = previous_x + x_offset;
  }
  if (bounding_box.top < 0) {
    // Top border
    y_offset -= bounding_box.top;
    bounding_box.top = 0;
    bounding_box.bottom = bounding_box.height;
    snapping_result.top = previous_y + y_offset;
  }
  if (bounding_box.bottom > bottom_edge_last_track) {
    // Bottom border
    y_offset -= (bounding_box.bottom - bottom_edge_last_track);
    bounding_box.bottom = bottom_edge_last_track;
    bounding_box.top = bounding_box.bottom - bounding_box.height;
    snapping_result.top = previous_y + y_offset;
  }

  return {"position": snapping_result, "x_offset": x_offset, "y_offset": y_offset};
}


/**
 * Primes are used for factoring.
 * Store any that have been found for future use.
 */
var global_primes = new Set();

/**
 * Creates a list of all primes less than n.
 * Stores primes in a set for better performance in the future.
 * If some primes have been found, start with that list,
 * and check the remaining numbers up to n.
 * @param {any number} n
 * @returns the list of all primes less than n
 */
function primesUpTo(n) {
  n = Math.floor(n);
  if (Array.from(global_primes).pop() >= n) { // All primes already found
    return Array.from(global_primes).filter( (x) => { return x < n; });
  }
  let start = 2; // 0 and 1 can't be prime
  let primes = [...Array(n+1).keys()]; // List from 0 to n
  if (Array.from(global_primes).length) { // Some primes already found
    start = Array.from(global_primes).pop() + 1;
    primes = primes.slice(start,primes.length -1);
    primes = Array.from(global_primes).concat(primes);
  } else {
    primes = primes.slice(start,primes.length -1);
  }
  primes.forEach( (p) => { // Sieve of Eratosthenes method of prime factoring
    primes = primes.filter( (test) => {
      return (test % p !== 0) || (test === p);
    });
    global_primes.add(p);
  });
  return primes;
}

/**
 * Every integer is either prime,
 * is the product of some list of primes.
 * @param {integer to factor} n
 * @returns the list of prime factors of n
 */
function primeFactorsOf(n) {
  n = Math.floor(n);
  let factors = [];
  let primes = primesUpTo(n);
  primes.push(n);
  while (n !== 1) {
      if (n % primes[0] === 0) {
          n = n/primes[0];
          factors.push(primes[0]);
      } else {
          primes.shift();
      }
  }
  return factors;
}

/**
 * From the pixels per second of the project,
 * Find a number of frames between each ruler mark,
 * such that the tick marks remain at least 50px apart.
 *
 * Increases the number of frames by factors of FPS.
 * This way each tick should land neatly on a second mark
 * @param {Pixels per second} pps
 * @param fps_num
 * @param fps_den
 * @returns
 */
function framesPerTick(pps, fps_num, fps_den) {
  let fps = fps_num / fps_den;
  let frames = 1;
  let seconds = () => { return frames / fps; };
  let pixels = () => { return seconds() * pps; };
  let factors = primeFactorsOf(Math.round(fps));
  while (pixels() < 40) {
      frames *= factors.shift() || 2;
  }

  return frames;
}

function setSelections(scope, element, id) {
  if (!element.hasClass("ui-selected")) {
    // Clear previous selections?
    var clear_selections = false;
    if ($(".ui-selected").length > 0) {
      clear_selections = true;

      // Remove ui-selected class immediately
      $(".ui-selected").each(function () {
          $(this).removeClass("ui-selected");
      });
    }

    // selectClip, selectTransition
    if (element.hasClass("clip")) {
      // Select this clip, unselect all others
      scope.selectTransition("", clear_selections);
      scope.selectClip(id, clear_selections);

    }
    else if (element.hasClass("transition")) {
      // Select this transition, unselect all others
      scope.selectClip("", clear_selections);
      scope.selectTransition(id, clear_selections);
    }
  }

  // Apply scope up to this point
  scope.$apply(function () {});
}

/**
 * <body> of index.html calls this on load.
 * Garauntees that the ruler is drawn when timeline first loads
 */
function forceDrawRuler() {
  var scroll = document.querySelector("#scrolling_tracks").scrollLeft;
  document.querySelector("#scrolling_tracks").scrollLeft = 10;
  document.querySelector("#scrolling_tracks").scrollLeft = scroll;
}

// Update the clip/transition data on Draggable stop (replaces the Track droppable)
function updateDraggables(scope, ui, itemType) {
    scope.enable_sorting = false;

    var scrolling_tracks = $("#scrolling_tracks");
    var vert_scroll_offset = scrolling_tracks.scrollTop();
    var horz_scroll_offset = scrolling_tracks.scrollLeft();

    // Track each dropped clip or transition
    var dropped_clips = [];
    var position_diff = 0; // The time difference for multiple selections (if any)
    var ui_selected = $(".ui-selected");

    // Arrays to collect updates for batch processing
    var clip_updates = [];
    var transition_updates = [];

    // UUID to group these updates as a single transaction
    var tid = uuidv4();

    // Loop through each selected item and remove the selection if multiple items are selected
    ui_selected.each(function (index) {
        var item = $(this);

        // Determine the type of item (clip or transition)
        var item_type = itemType || null;
        if (item.hasClass("clip")) {
            item_type = "clip";
        } else if (item.hasClass("transition")) {
            item_type = "transition";
        } else {
            // Unknown drop type, skip it
            return;
        }

        // Get the item properties
        var item_id = item.attr("id");
        var item_num = item_id.substr(item_id.indexOf("_") + 1);
        var item_left = item.position().left;

        // Adjust for scrollbars
        item_left = parseFloat(item_left + horz_scroll_offset);
        var item_top = parseFloat(item.position().top + vert_scroll_offset);

        // Prevent items from being dropped too far to the left
        if (item_left < 0) {
            item_left = 0;
        }

        // Get the track where the item was dropped
        let drop_track = findTrackAtLocation(scope, parseInt(item_top, 10));
        if (drop_track != null) {
            // Find the item in the project JSON data
            let item_data = null;
            if (item_type === "clip") {
                item_data = findElement(scope.project.clips, "id", item_num);
            } else if (item_type === "transition") {
                item_data = findElement(scope.project.effects, "id", item_num);
            }

            // Set the time difference (if not already calculated)
            if (position_diff === 0.0) {
                position_diff = (item_left / scope.pixelsPerSecond) - item_data.position;
            }

            scope.$apply(function () {
                // Set track and position
                item_data.layer = drop_track.number;
                item_data.position += position_diff;
            });

            scope.$apply(function () {
                // Snap to FPS grid (if necessary)
                item_data.position = snapToFPSGridTime(scope, item_data.position);
            });

            // Keep track of dropped clips/transitions
            dropped_clips.push(item_data);

            // Collect updates for batch processing
            if (item_type === "clip") {
                clip_updates.push(item_data);
            } else if (item_type === "transition") {
                transition_updates.push(item_data);
            }
        }
    });

    // Batch process updates
    clip_updates.forEach(function(item_data, index) {
        var needs_refresh = (index === clip_updates.length - 1);
        timeline.update_clip_data(JSON.stringify(item_data), true, true, !needs_refresh, tid);
    });

    transition_updates.forEach(function(item_data, index) {
        var needs_refresh = (index === transition_updates.length - 1);
        timeline.update_transition_data(JSON.stringify(item_data), true, !needs_refresh, tid);
    });

    // Add missing transitions (if any)
    if (dropped_clips.length === 1) {
        for (var clip_index = 0; clip_index < dropped_clips.length; clip_index++) {
            var item_data = dropped_clips[clip_index];

            // Check for missing transitions
            var missing_transition_details = scope.getMissingTransitions(item_data);
            if (scope.Qt && missing_transition_details !== null) {
                timeline.add_missing_transition(JSON.stringify(missing_transition_details));
            }
        }
    }

    // Clear dropped clips
    dropped_clips = [];

    // Re-enable sorting and sort items
    scope.enable_sorting = true;
    scope.sortItems();
    scope.resizeTimeline();

    // Delay clearing the dragging variable (to prevent an ng-click race condition
    // which causes selections to be randomly cleared after a drag)
    setTimeout(function() {
      scope.setDragging(false);
    }, 100);
}
