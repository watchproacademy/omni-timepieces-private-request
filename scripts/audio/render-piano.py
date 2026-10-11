import math, wave, struct
rate=24000
beat=60/76
bars=16
length=int((bars*3*beat+4)*rate)
left=[0.0]*length
right=[0.0]*length
# Original short salon waltz in D major: a lyrical upper line, lightly broken
# harmony, restrained dynamics, and a natural cadence. No sampled recording.
chords=[(50,57,66),(47,54,62),(43,50,59),(45,52,61),
        (50,57,66),(47,54,62),(43,57,62),(45,55,61),
        (54,57,62),(47,54,62),(43,50,59),(45,52,61),
        (50,57,66),(43,50,59),(45,55,61),(50,57,66)]
melodies=[[(0,69,1),(1,66,.5),(1.5,67,.5),(2,69,1)],
[(0,71,1.5),(1.5,69,.5),(2,66,1)],[(0,67,1),(1,66,1),(2,64,1)],[(0,64,2),(2,61,1)],
[(0,66,1.5),(1.5,69,.5),(2,74,1)],[(0,73,1),(1,71,1),(2,69,1)],
[(0,67,1),(1,69,.5),(1.5,67,.5),(2,66,1)],[(0,64,2.5)],
[(0,69,1),(1,74,1),(2,73,1)],[(0,71,1.5),(1.5,69,.5),(2,66,1)],
[(0,67,1),(1,71,1),(2,69,1)],[(0,64,1.5),(1.5,66,.5),(2,67,1)],
[(0,66,1),(1,64,1),(2,62,1)],[(0,67,1.5),(1.5,66,.5),(2,64,1)],
[(0,61,1),(1,64,1),(2,69,1)],[(0,62,3)]]
def note(start,midi,duration,velocity):
    freq=440*2**((midi-69)/12)
    offset=int(start*rate)
    tail=duration+2.0
    pan=max(.25,min(.75,.5+(midi-62)*.008))
    harmonics=[1,.36,.15,.075,.026]
    for i in range(min(int(tail*rate),length-offset)):
        t=i/rate
        attack=1-math.exp(-t/.012)
        release=math.exp(-max(0,t-duration)/.32)
        tone=sum(a*math.sin(2*math.pi*freq*(h+1)*(1+.000035*h*h)*t)*math.exp(-t*(.9+h*.6)) for h,a in enumerate(harmonics))
        value=tone*attack*release*velocity
        left[offset+i]+=value*math.sqrt(1-pan)
        right[offset+i]+=value*math.sqrt(pan)
for b,(bass,middle,upper) in enumerate(chords):
    start=b*3*beat
    note(start,bass,beat*1.5,.042)
    note(start+beat,middle,beat*.8,.026)
    note(start+beat*1.5,upper,beat*.8,.020)
    note(start+beat*2,middle,beat*.7,.023)
    for j,(position,pitch,duration) in enumerate(melodies[b]):
        note(start+position*beat+.013,pitch,duration*beat,.067 if j==0 else .058)
# Small diffuse room reflections, no metallic resonator or persistent drone.
for channel in (left,right):
    dry=channel[:]
    for seconds,gain in [(.073,.12),(.127,.09),(.193,.065),(.281,.04)]:
        delay=int(seconds*rate)
        for i in range(delay,length):channel[i]+=dry[i-delay]*gain
peak=max(max(abs(x) for x in left),max(abs(x) for x in right))
with wave.open('/private/tmp/omni-classical-piano-preview.wav','wb') as output:
    output.setparams((2,2,rate,0,'NONE','not compressed'))
    frames=bytearray()
    for i,(l,r) in enumerate(zip(left,right)):
        fade=min(1,i/(rate*.35),(length-i)/(rate*2))
        frames.extend(struct.pack('<hh',int(l*fade*32767),int(r*fade*32767)))
    output.writeframes(frames)
print({'seconds':round(length/rate,1),'peak':round(peak,3),'file':'/private/tmp/omni-classical-piano-preview.wav'})
