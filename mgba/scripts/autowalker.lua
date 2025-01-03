-- autowalks left/right or up/down on a loop until B is pressed or
-- stopWalking() is called - used for egg hatching without resorting to cheats
-- or just walking so that your daycare pokemon gain xp so you can evolve them
-- with a single rare candy:
--
-- startWalking() -- defaults to up/down for 20s each
-- stopWalking() -- or just press B
-- startWalking(C.GBA_KEY.RIGHT) -- left/right for 20s each
-- startWalking(C.GBA_KEY.RIGHT, 10) -- left/right for 10s each

local keyEventQueue = {}
local isWalking = false

-----------
-- Utils --
-----------

function toBitmask(keys)
    local mask = 0
    for _, key in ipairs(keys) do
        mask = mask | (1 << tonumber(key))
    end
    return mask
end

function oppositeKey(key)
    keys = {
        [C.GBA_KEY.DOWN] = C.GBA_KEY.UP,
        [C.GBA_KEY.UP] = C.GBA_KEY.DOWN,
        [C.GBA_KEY.LEFT] = C.GBA_KEY.RIGHT,
        [C.GBA_KEY.RIGHT] = C.GBA_KEY.LEFT
    }

    return keys[key]
end

function holdKey(key, duration)
    local startFrame = emu:currentFrame()
    local endFrame = startFrame + duration + 1

    table.insert(keyEventQueue,
    {
        key = key,
        startFrame = startFrame,
        endFrame = endFrame,
        pressed = false,
        duration = duration
    });
end

function shouldKeyEventStart(keyEvent)
    -- current frame is past the keyEvent start frame
    -- but before the keyEvent end frame
    -- and the key hasn't been pressed yet
    return emu:currentFrame() >= keyEvent.startFrame and emu:currentFrame() <= keyEvent.endFrame and not keyEvent.pressed
end

function shouldKeyEventEnd(keyEvent)
    return emu:currentFrame() > keyEvent.endFrame
end

---------------
-- Callbacks --
---------------

-- on: frame
function updateKeys()
    local indexesToRemove = {}
    local newKeyEvents = {}

    -- loop through the keyEventQueue
    -- press any keys that should start
    -- collect index of events that should end and clear their keys
    for index, keyEvent in ipairs(keyEventQueue) do
        if shouldKeyEventStart(keyEvent) then
            emu:addKey(keyEvent.key)
            keyEvent.pressed = true
        elseif shouldKeyEventEnd(keyEvent) then
            emu:clearKey(keyEvent.key)
            table.insert(indexesToRemove, index)
            table.insert(newKeyEvents, { key = oppositeKey(keyEvent.key), duration = keyEvent.duration })
        end
    end

    -- cleanup: remove events that have ended from queue
    for _, i in ipairs(indexesToRemove) do
        table.remove(keyEventQueue, i)
    end

    -- update the queue with the opposite direction to events that have ended
    for _, event in ipairs(newKeyEvents) do
        holdKey(event.key, event.duration)
    end
end

-- on: keysRead
function stopOnB()
    if isWalking and emu:getKey(C.GBA_KEY.B) == 1 then
        stopWalking()
    end
end

----------------
-- Public API --
----------------

function startWalking(walkDirection, walkLength)
    local key = walkDirection or C.GBA_KEY.DOWN
    local seconds = walkLength or 20 -- how long the walk in each direction
    local duration = seconds * 60 -- 60fps * duration

    isWalking = true
    holdKey(key, duration)
end

function stopWalking()
    isWalking = false
    keyEventQueue = {}

    emu:clearKeys(
        toBitmask(
            {
                C.GBA_KEY.B,
                C.GBA_KEY.DOWN,
                C.GBA_KEY.UP,
                C.GBA_KEY.LEFT,
                C.GBA_KEY.RIGHT,
            }
        )
    )
end

function main()
    callbacks:add("frame", updateKeys)
    callbacks:add("keysRead", stopOnB)

    startWalking()
end

main()

