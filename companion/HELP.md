## Keynote Companion

Connects to the **Keynote Companion** menu-bar app on a Mac. The app reads the current slide and
presenter notes from Keynote or Microsoft PowerPoint, and this module shows them in Companion, turns `[LABEL]` tags in
the notes into cues, and lets Companion move through the slideshow.

### Setup

1. Run Keynote Companion on the Mac with Keynote or PowerPoint. Its menu lists the address and port, for example `192.168.1.20:7878`.
2. Enter that address and port here. Use `127.0.0.1` if Companion runs on the same Mac.
3. If you set a shared token in the app, enter the same token here.

### Labels in presenter notes

Put tags in square brackets in a slide's presenter notes, for example
`Introduce the panel. [CAM1] [LIGHTS WARM]`. When that slide comes up during a slideshow,
the app fires each label in order.

To run actions when a label fires, create a Companion **Trigger** with the event
_"On condition becoming true"_ and the condition **Label fired** set to the label (for example `CAM1`).
Labels match regardless of case, and `CAM1` and `[CAM1]` both work.

You can also watch the `last_label` and `trigger_count` variables. `trigger_count` changes on every
fire, even when the same label fires twice in a row.

### Actions

- **Next**, **Previous**
- **First slide**, **Last slide**
- **Go to slide** (slide number; expressions and variables work)
- **Start slideshow** from the beginning, the current slide or a slide number
- **Stop slideshow**
- **Refresh state**

### Feedbacks

- **Connected to the Mac app**
- **Slideshow is playing**
- **Following app**: true while the Mac app follows Keynote (or PowerPoint) and it is running
- **Current slide is** a given number
- **Current slide has label**: true while the slide on screen carries the label
- **Label fired**: true for a moment (default 1 s) after the label fires. Leave the label empty to match any label.

### Variables

| Variable                                                      | Value                                                                    |
| ------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `slide`, `slide_count`, `slide_display`, `slides_remaining`   | Current slide number, total, "5 / 40", slides after this one             |
| `notes`, `notes_plain`                                        | Presenter notes with and without the `[...]` tags                        |
| `labels`, `label_count`                                       | Labels on the current slide, comma separated, and how many               |
| `last_label`, `last_label_slide`, `last_label_direction`      | The most recent label fired                                              |
| `trigger_count`                                               | Labels fired since connecting                                            |
| `document`, `playing`, `connected`                            | Presentation name and status                                             |
| `app`, `app_running`, `keynote_running`, `powerpoint_running` | App being followed ("Keynote" or "PowerPoint") and whether it is running |

### Keynote or PowerPoint

The Mac app's **Follow** setting chooses the app: Automatic (whichever is presenting, otherwise
the one used last), Keynote or PowerPoint. Actions go to that app.

Slide numbers follow the app: Keynote leaves out skipped slides, PowerPoint counts hidden ones.
