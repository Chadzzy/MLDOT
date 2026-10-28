import { useState } from "react";
import { useJourney } from "./context.js";
import { Icon } from "./icons.jsx";
import { ModuleRow, TimingNote } from "./components.jsx";
import { CATALOGUE } from "./data.js";
import { displayFlight, time, date } from "./model.js";
import {
  intentLabel,
  transportLabel,
  transportAllowance,
} from "./preparation-model.js";
import loungePhoto from "./assets/pier-first.jpg";
import "./preparation.css";

export const PREP_TITLES = {
  prepare: "Get ready for your journey",
  "prep-intent": "Make it your journey",
  "prep-transport": "Getting to the airport",
  "prep-family": "Family and support",
  "prep-food": "Food for your journey",
  "prep-rest": "Arrive in your own rhythm",
  "prep-media": "Your flight playlist",
  "prep-onboard": "Welcome on board",
  "prep-arrival": "Your arrival in Zurich",
  "prep-feedback": "How was your journey?",
  "prep-ready": "Your journey at a glance",
};
function Heading({ eyebrow, title, children }) {
  return (
    <>
      <span className="prep-eyebrow">{eyebrow}</span>
      <h2 className="prep-title">{title}</h2>
      {children && <p className="prep-intro">{children}</p>}
    </>
  );
}
function Choice({ label, detail, icon, selected, onClick }) {
  return (
    <button
      className={`prep-choice ${selected ? "selected" : ""}`}
      aria-pressed={selected}
      onClick={onClick}
    >
      {icon && (
        <span className="prep-choice-icon">
          <Icon name={icon} />
        </span>
      )}
      <span>
        <strong>{label}</strong>
        {detail && <small>{detail}</small>}
      </span>
      <span className="prep-radio">
        {selected && <Icon name="check" size={13} />}
      </span>
    </button>
  );
}
function Note({ title, children, icon = "info" }) {
  return (
    <div className="prep-note">
      <Icon name={icon} size={21} />
      <div>
        {title && <strong>{title}</strong>}
        <p>{children}</p>
      </div>
    </div>
  );
}
function Footer({ children }) {
  return <p className="prep-footnote">{children}</p>;
}
function Save({ values, children = "Save to my journey" }) {
  const { dispatch, close, toast } = useJourney();
  return (
    <div className="prep-actions">
      <button
        className="primary-button"
        onClick={() => {
          dispatch({ type: "PREPARATION", values });
          toast("Saved to your journey");
          close();
        }}
      >
        {children}
      </button>
      <button className="prep-text-button" onClick={close}>
        Not now
      </button>
    </div>
  );
}
export function PreparationEntry() {
  const { state, open } = useJourney();
  return (
    <button className="prep-entry" onClick={() => open("prepare")}>
      <span className="prep-entry-icon">
        <Icon name="bag" size={25} />
      </span>
      <span>
        <strong>Get ready for your journey</strong>
        <small>
          {state.preparation.intent
            ? `${intentLabel(state.preparation.intent)} · Your choices, together`
            : "A little planning. A more personal journey."}
        </small>
      </span>
      <Icon name="chevron" size={18} />
    </button>
  );
}
function Overview() {
  const { state, journey, open } = useJourney(),
    p = state.preparation;
  const flight = displayFlight(journey);
  return (
    <>
      <Heading
        eyebrow={`${flight.number} · HONG KONG TO ZURICH`}
        title="Make this journey yours."
      >
        A few things to make travel feel easier. Start anywhere, and come back
        whenever you like.
      </Heading>
      {(journey.isUncertain || journey.isDisrupted) && (
        <Note title="Your choices stay with you">
          {journey.recovery
            ? "Your new itinerary is selected. Review timings before making plans."
            : "Your flight has changed. We’ll keep your preferences while departure plans are updated."}
        </Note>
      )}
      <button className="prep-purpose" onClick={() => open("prep-intent")}>
        <Icon name={p.intent === "rest" ? "moon" : "spark"} size={26} />
        <span>
          <small>FOR THIS JOURNEY</small>
          <strong>{intentLabel(p.intent)}</strong>
          <p>
            {p.intent
              ? "Change what you’d like us to focus on."
              : "Rest, a little discovery, or just keeping it easy."}
          </p>
        </span>
        <Icon name="chevron" size={18} />
      </button>
      <div className="prep-section-heading">
        <h3>Before you leave</h3>
        <span>At your own pace</span>
      </div>
      <div className="module-group">
        <ModuleRow
          icon="map"
          title={transportLabel(p.transport)}
          subtitle={
            p.transport
              ? "Your transport plan · Edit"
              : "How are you planning to get there?"
          }
          onClick={() => open("prep-transport")}
        />
        <ModuleRow
          icon="user"
          title="Family & support"
          subtitle={
            p.family === "yes"
              ? `Travelling with children${p.buggy ? " · With a buggy" : ""}`
              : p.assistance && p.assistance !== "none"
                ? "Support preference saved · Not requested"
                : "The little details that make a difference"
          }
          onClick={() => open("prep-family")}
        />
        <ModuleRow
          icon="coffee"
          title="Food along the way"
          subtitle={
            p.meal === "vegetarian"
              ? "Vegetarian preference · Not ordered"
              : "Your meal preferences, in one place"
          }
          onClick={() => open("prep-food")}
        />
      </div>
      <div className="prep-section-heading">
        <h3>Make time for yourself</h3>
      </div>
      <div className="module-group">
        <ModuleRow
          icon="moon"
          title="Arrive in your own rhythm"
          subtitle={`Arrive ${time(flight.arrival, "Europe/Zurich")} in Zurich · Plan your rest`}
          onClick={() => open("prep-rest")}
        />
        <ModuleRow
          icon="headphones"
          title="Your flight playlist"
          subtitle={
            state.saved.length
              ? `${state.saved.length} selections saved · Keep exploring`
              : "Pick something you’ll look forward to"
          }
          onClick={() => open("prep-media")}
        />
      </div>
      <button className="prep-text-button" onClick={() => open("prep-ready")}>
        <Icon name="circleCheck" size={19} /> View your journey at a glance{" "}
        <Icon name="chevron" size={17} />
      </button>
      <button
        className="prep-text-button"
        onClick={() => {
          open("prep-intent");
        }}
      >
        I’m exhausted. Help me decide.
      </button>
      <Footer>
        Your choices are optional. You can change them at any time.
      </Footer>
    </>
  );
}
function Intent() {
  const { state } = useJourney();
  const [choice, setChoice] = useState(state.preparation.intent);
  return (
    <>
      <Heading
        eyebrow="A JOURNEY THAT WORKS FOR YOU"
        title="What would make this a good journey?"
      >
        Tell us what matters today. You can change your mind.
      </Heading>
      <div className="prep-choices">
        <Choice
          label="Keep it easy"
          detail="I’m exhausted. Fewer decisions would help."
          icon="leaf"
          selected={choice === "easy"}
          onClick={() => setChoice("easy")}
        />
        <Choice
          label="Arrive rested"
          detail="Make space to unwind before the day ahead."
          icon="moon"
          selected={choice === "rest"}
          onClick={() => setChoice("rest")}
        />
        <Choice
          label="Enjoy the journey"
          detail="A good meal, a film and a little discovery."
          icon="spark"
          selected={choice === "enjoy"}
          onClick={() => setChoice("enjoy")}
        />
      </div>
      {choice && (
        <Note title="What this changes" icon="check">
          {choice === "easy"
            ? "We’ll keep your airport suggestion simple and put your saved choices within reach."
            : choice === "rest"
              ? "We’ll favour a quiet airport stop when time allows, and keep your rest plan close."
              : "We’ll bring food and entertainment ideas together, with your boarding time in view."}
        </Note>
      )}
      <Save values={{ intent: choice }} />
    </>
  );
}
function Transport() {
  const { state, journey } = useJourney();
  const [choice, setChoice] = useState(state.preparation.transport);
  const minutes = transportAllowance(choice);
  return (
    <>
      <Heading
        eyebrow="BEFORE YOU LEAVE"
        title="How will you get to the airport?"
      >
        We’ll keep the next step relevant to your plans.
      </Heading>
      <div className="prep-choices">
        {[
          ["rail", "Airport Express", "Train from Hong Kong Station", "map"],
          [
            "car",
            "Taxi or ride",
            "Plan a pickup, then choose your ride",
            "pin",
          ],
          [
            "dropoff",
            "Someone’s dropping me off",
            "Keep your arrival time handy",
            "user",
          ],
          [
            "undecided",
            "I haven’t decided",
            "Come back to this later",
            "clock",
          ],
        ].map(([id, label, detail, icon]) => (
          <Choice
            key={id}
            label={label}
            detail={detail}
            icon={icon}
            selected={choice === id}
            onClick={() => setChoice(id)}
          />
        ))}
      </div>
      {minutes && (
        <div className="prep-time-card">
          <small>FROM CENTRAL</small>
          <strong>Allow around {minutes} minutes</strong>
          <p>
            For the journey to HKIA. Recheck traffic or train information before
            leaving.
          </p>
          <div>
            <span>Scheduled departure</span>
            <b>{time(journey.flight.departure)} HKT</b>
          </div>
        </div>
      )}
      {choice === "car" && (
        <Note title="A ride handoff, when you’re ready">
          Confirm your pickup, destination and fare in your chosen ride app.
        </Note>
      )}
      <Save values={{ transport: choice }} />
      <Footer>
        Estimated travel times from Central. Allow extra time for check-in and
        security.
      </Footer>
    </>
  );
}
function Family() {
  const { state } = useJourney();
  const [family, setFamily] = useState(state.preparation.family),
    [buggy, setBuggy] = useState(state.preparation.buggy),
    [assistance, setAssistance] = useState(state.preparation.assistance);
  return (
    <>
      <Heading eyebrow="FAMILY & SUPPORT" title="A little help along the way.">
        Choose anything you’d like us to keep in mind for this journey.
      </Heading>
      <h3 className="prep-question">Are you travelling with children?</h3>
      <div className="prep-segment">
        {[
          ["yes", "Yes"],
          ["no", "No"],
        ].map(([id, label]) => (
          <button
            aria-pressed={family === id}
            className={family === id ? "selected" : ""}
            onClick={() => setFamily(id)}
            key={id}
          >
            {label}
          </button>
        ))}
      </div>
      {family === "yes" && (
        <div className="prep-reveal">
          <Choice
            label="We’re bringing a buggy"
            detail="Include handover and collection in our plan"
            icon="bag"
            selected={buggy}
            onClick={() => setBuggy(!buggy)}
          />
          {buggy && (
            <Note title="Worth checking before you leave">
              Where can you use it, where will it be handed over, and where will
              it be returned? Your airline and airport arrangements need
              confirming.
            </Note>
          )}
        </div>
      )}
      <h3 className="prep-question">Would support be helpful?</h3>
      <div className="prep-choices">
        {[
          ["none", "No additional support", "You can change this later"],
          [
            "walking",
            "Help with walking or a wheelchair",
            "Keep assistance and transfer time in view",
          ],
          [
            "discuss",
            "I’d like to discuss my needs",
            "A person can help confirm the right support",
          ],
        ].map(([id, label, detail]) => (
          <Choice
            key={id}
            label={label}
            detail={detail}
            selected={assistance === id}
            onClick={() => setAssistance(id)}
          />
        ))}
      </div>
      {assistance && assistance !== "none" && (
        <Note title="Preference saved when you continue">
          Confirm your assistance arrangements with the airline before travel.
        </Note>
      )}
      <Save values={{ family, buggy, assistance }} />
    </>
  );
}
function Food() {
  const { state, journey, open } = useJourney();
  const [choice, setChoice] = useState(state.preparation.meal);
  return (
    <>
      <Heading
        eyebrow="FOOD ALONG THE WAY"
        title="Something to look forward to."
      >
        Keep your meal preference with the rest of your plans.
      </Heading>
      <div className="prep-choices">
        {[
          [
            "standard",
            "Choose on board",
            "See what’s offered during your flight",
          ],
          [
            "vegetarian",
            "I prefer vegetarian food",
            "Keep this preference in my journey",
          ],
          ["later", "I’ll decide later", "Leave this open for now"],
        ].map(([id, label, detail]) => (
          <Choice
            key={id}
            label={label}
            detail={detail}
            icon="coffee"
            selected={choice === id}
            onClick={() => setChoice(id)}
          />
        ))}
      </div>
      {journey.isDisrupted ? (
        <Note title="Lounge access needs reviewing">
          Your flight has changed. Confirm access against your replacement
          itinerary before planning a lounge meal.
        </Note>
      ) : (
        <>
          <TimingNote />
          <div className="prep-lounge">
            <img src={loungePhoto} alt="The Pier, First lounge" />
            <div>
              <small>YOUR INCLUDED CATHAY LOUNGE</small>
              <h3>A meal before you fly</h3>
              <p>
                The Pier, First is included for your Diamond membership. Check
                your time before heading over.
              </p>
              <button
                className="prep-text-button"
                onClick={() => open("lounge")}
              >
                Explore your lounge <Icon name="chevron" size={16} />
              </button>
            </div>
          </div>
        </>
      )}
      <Save values={{ meal: choice }} />
      <Footer>
        Your meal preference is saved separately from your order. Confirm
        special meal availability with the airline.
      </Footer>
    </>
  );
}
function Rest() {
  const { state, journey, open } = useJourney();
  const [choice, setChoice] = useState(state.preparation.rest);
  const flight = displayFlight(journey);
  return (
    <>
      <Heading eyebrow="ARRIVE IN YOUR OWN RHYTHM" title="Make room to unwind.">
        Your scheduled arrival in Zurich is{" "}
        {time(flight.arrival, "Europe/Zurich")}. How would you like to spend
        your time on board?
      </Heading>
      <div className="prep-clock-pair">
        <div>
          <small>HONG KONG · {date(flight.departure)}</small>
          <strong>{time(flight.departure)}</strong>
          <span>Scheduled departure</span>
        </div>
        <Icon name="plane" size={22} />
        <div>
          <small>ZURICH · {date(flight.arrival, "Europe/Zurich")}</small>
          <strong>{time(flight.arrival, "Europe/Zurich")}</strong>
          <span>Scheduled arrival</span>
        </div>
      </div>
      {(journey.isDisrupted || journey.isUncertain) && (
        <Note title="Review when your flight is confirmed">
          {journey.recovery
            ? "These are your selected recovery times. Revisit your rest choices around the new itinerary."
            : "Your departure is changing. These scheduled times are a reference, not a confirmed rest window."}
        </Note>
      )}
      <div className="prep-choices">
        {[
          [
            "settle",
            "Settle in, then rest",
            "Keep something calming ready to listen to",
          ],
          [
            "flexible",
            "Keep it flexible",
            "Save a film and decide when I’m on board",
          ],
          [
            "awake",
            "Enjoy some time for myself",
            "Explore films and music before choosing",
          ],
        ].map(([id, label, detail]) => (
          <Choice
            key={id}
            label={label}
            detail={detail}
            icon={id === "settle" ? "moon" : "headphones"}
            selected={choice === id}
            onClick={() => setChoice(id)}
          />
        ))}
      </div>
      <Save values={{ rest: choice }} />
      <button className="prep-text-button" onClick={() => open("prep-media")}>
        Choose something for the flight <Icon name="arrow" size={16} />
      </button>
      <Footer>
        This is an editable rest intention. Personalised jet-lag timings and
        sleep recommendations are still being explored.
      </Footer>
    </>
  );
}
function Media() {
  const { state, dispatch, open } = useJourney();
  const [tab, setTab] = useState("all");
  const mood = state.preferences.mood;
  const items = [...CATALOGUE]
    .sort(
      (a, b) => Number(b.moods.includes(mood)) - Number(a.moods.includes(mood)),
    )
    .filter((item) => tab === "all" || item.category === tab);
  return (
    <>
      <Heading eyebrow="YOUR FLIGHT PLAYLIST" title="A little more you.">
        Find a film, save a playlist, and take your choices on board.
      </Heading>
      <div className="prep-taste">
        <small>WHAT ARE YOU IN THE MOOD FOR?</small>
        <div className="prep-chips">
          {[
            ["unwind", "Unwind"],
            ["discover", "Discover"],
            ["rest", "Rest"],
          ].map(([id, label]) => (
            <button
              key={id}
              aria-pressed={mood === id}
              className={mood === id ? "selected" : ""}
              onClick={() =>
                dispatch({ type: "PREFERENCE", key: "mood", value: id })
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="prep-segment prep-tabs">
        {[
          ["all", "For you"],
          ["watch", "Films"],
          ["music", "Music"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            className={tab === id ? "selected" : ""}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="prep-media-list">
        {items.map((item) => (
          <article className="prep-media-item" key={item.id}>
            <div className={`prep-media-art ${item.style}`}>
              <Icon name={item.icon} size={28} />
            </div>
            <div>
              <strong>{item.title}</strong>
              <small>
                {item.subtitle} · {item.duration} min
              </small>
              {item.moods.includes(mood) && (
                <em>
                  {mood === "rest"
                    ? "A quieter choice for your flight"
                    : mood === "discover"
                      ? "Something to discover"
                      : "For your unwind mood"}
                </em>
              )}
            </div>
            <button
              aria-label={`${state.saved.includes(item.id) ? "Remove" : "Save"} ${item.title}`}
              aria-pressed={state.saved.includes(item.id)}
              onClick={() => dispatch({ type: "SAVE", id: item.id })}
            >
              <Icon
                name={state.saved.includes(item.id) ? "check" : "plus"}
                size={19}
              />
            </button>
          </article>
        ))}
      </div>
      <Note title="Bring your film tastes with you" icon="film">
        Explore films and music by mood, and save your favourites for the
        journey.
      </Note>
      <button className="primary-button" onClick={() => open("prep-onboard")}>
        On board · {state.saved.length} saved <Icon name="arrow" size={18} />
      </button>
      <Footer>
        Onboard availability may vary. Your selections are saved; media is not
        downloaded.
      </Footer>
    </>
  );
}
function Onboard() {
  const { state, journey, open } = useJourney();
  const [paired, setPaired] = useState(false);
  const flight = displayFlight(journey);
  const saved = state.saved
    .map((id) => CATALOGUE.find((item) => item.id === id))
    .filter(Boolean);
  return (
    <>
      <Heading
        eyebrow="ON BOARD"
        title={
          paired ? "Your choices, together." : "Pick up where you left off."
        }
      >
        {paired
          ? "Your films and music, saved in one place."
          : "When you’re on board, link your saved selections to your seatback screen."}
      </Heading>
      <div className={`prep-seatback ${paired ? "paired" : ""}`}>
        <div className="prep-seatback-top">
          <span>STUDIO CX</span>
          <span>{flight.seat ? `Seat ${flight.seat}` : "Seat pending"}</span>
        </div>
        {paired ? (
          <>
            <span className="prep-connected">
              <Icon name="check" size={17} /> Saved selections
            </span>
            <h3>Your flight playlist</h3>
            <div className="prep-seatback-queue">
              {saved.map((item, i) => (
                <div key={item.id}>
                  <span>{String(i + 1).padStart(2, "0")}</span>
                  <Icon name={item.icon} size={18} />
                  <strong>{item.title}</strong>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <Icon name="headphones" size={42} />
            <h3>Make yourself at home.</h3>
            <p>Your films and music, ready to choose.</p>
            <div className="prep-pair-code">
              <small>PAIRING CODE</small>
              <strong>JOURNEY</strong>
            </div>
          </>
        )}
      </div>
      <div className="prep-steps">
        <div>
          <span>1</span>
          <p>Open pairing on your seatback screen.</p>
        </div>
        <div>
          <span>2</span>
          <p>Scan its QR or enter the pairing code.</p>
        </div>
        <div>
          <span>3</span>
          <p>Confirm the screen and bring over your selections.</p>
        </div>
      </div>
      {saved.length ? (
        <button className="primary-button" onClick={() => setPaired(!paired)}>
          {paired ? "Back to pairing" : "View my selections"}
        </button>
      ) : (
        <button className="primary-button" onClick={() => open("prep-media")}>
          Choose something for your flight
        </button>
      )}
      {paired && (
        <button
          className="secondary-button"
          onClick={() => open("prep-arrival")}
        >
          Your arrival <Icon name="arrow" size={17} />
        </button>
      )}
      <Footer>
        Your selections are saved on this device. Seatback connection pending.
      </Footer>
    </>
  );
}
function Arrival() {
  const { state, journey, open } = useJourney();
  const flight = displayFlight(journey);
  const [ready, setReady] = useState(false);
  return (
    <>
      <Heading eyebrow="YOUR ARRIVAL" title="A gentler start in Zurich.">
        Keep the next few steps simple, then make the day your own.
      </Heading>
      <div className="prep-time-card">
        <small>
          {date(flight.arrival, "Europe/Zurich")} · ZURICH LOCAL TIME
        </small>
        <strong>{time(flight.arrival, "Europe/Zurich")}</strong>
        <p>
          Scheduled arrival ·{" "}
          {state.preparation.intent === "rest"
            ? "Your intention: arrive rested"
            : "Your onward plans, in view"}
        </p>
      </div>
      <div className="prep-timeline">
        <div>
          <Icon name="bag" />
          <span>
            <strong>Collect your bags, if checked</strong>
            <p>Belt and baggage status will appear when available.</p>
          </span>
        </div>
        <div>
          <Icon name="pin" />
          <span>
            <strong>Head to the arrivals area</strong>
            <p>Allow time for border checks and finding the exit.</p>
          </span>
        </div>
        <div>
          <Icon name="map" />
          <span>
            <strong>Your onward ride</strong>
            <p>Choose your pickup when you’re ready to leave.</p>
          </span>
        </div>
      </div>
      <button className="primary-button" onClick={() => setReady(true)}>
        I’m ready to leave
      </button>
      {ready && (
        <Note title="Your onward ride" icon="pin">
          Confirm your pickup point and fare in your ride app when you’re ready.
        </Note>
      )}
      <button
        className="secondary-button"
        onClick={() => open("prep-feedback")}
      >
        Reflect on your journey
      </button>
      <Footer>Check local pickup signs after collecting your bags.</Footer>
    </>
  );
}
function Feedback() {
  const { state, dispatch } = useJourney();
  const [choice, setChoice] = useState(state.preparation.feedback),
    [detail, setDetail] = useState(state.preparation.feedbackDetail);
  const [sent, setSent] = useState(state.preparation.feedbackSent);
  return (
    <>
      {sent ? (
        <>
          <div className="prep-thanks">
            <span>
              <Icon name="check" size={32} />
            </span>
            <Heading
              eyebrow="THANK YOU"
              title="A little better, every journey."
            >
              Your response is saved. Thank you for helping shape the
              experience.
            </Heading>
          </div>
          <button className="secondary-button" onClick={() => setSent(false)}>
            Edit my response
          </button>
        </>
      ) : (
        <>
          <Heading
            eyebrow="LOOKING BACK"
            title="Did this help you feel prepared?"
          >
            Think about the guidance along the way, even if your flight didn’t
            go to plan.
          </Heading>
          <div className="prep-choices">
            {[
              ["yes", "Yes, it helped", "I knew what to do next"],
              ["partly", "Some of the time", "There’s room to make it better"],
              ["no", "Not really", "Something important was missing"],
            ].map(([id, label, sub]) => (
              <Choice
                key={id}
                label={label}
                detail={sub}
                selected={choice === id}
                onClick={() => setChoice(id)}
              />
            ))}
          </div>
          {choice && (
            <label className="prep-feedback-label">
              {choice === "yes"
                ? "What helped most?"
                : "What could have helped?"}{" "}
              <small>Optional</small>
              <textarea
                value={detail}
                maxLength={300}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Tell us in your own words"
                rows={3}
              />
            </label>
          )}
          <button
            className="primary-button"
            disabled={!choice}
            onClick={() => {
              dispatch({
                type: "PREPARATION",
                values: {
                  feedback: choice,
                  feedbackDetail: detail,
                  feedbackSent: true,
                },
              });
              setSent(true);
            }}
          >
            Save my feedback
          </button>
        </>
      )}
      <Footer>Your feedback is saved on this device.</Footer>
    </>
  );
}
function Ready() {
  const { state, journey, open } = useJourney();
  const p = state.preparation;
  return (
    <>
      <Heading
        eyebrow="YOUR JOURNEY AT A GLANCE"
        title="The next steps, together."
      >
        Your flight updates and your own plans, with room to fill in the
        details.
      </Heading>
      <div className="prep-section-heading">
        <h3>Your flight</h3>
        <span>Journey information</span>
      </div>
      <Note
        title={journey.status}
        icon={journey.isDisrupted || journey.isUncertain ? "alert" : "plane"}
      >
        {journey.detail}
      </Note>
      <TimingNote />
      <div className="module-group">
        <ModuleRow
          icon="plane"
          title="Aircraft readiness"
          subtitle="View known updates and what’s still unconfirmed"
          onClick={() => open("readiness")}
        />
      </div>
      <div className="prep-section-heading">
        <h3>Your airport plan</h3>
      </div>
      <div className="module-group">
        <ModuleRow
          icon="map"
          title={transportLabel(p.transport)}
          subtitle={
            p.transport
              ? "Plan chosen · Travel time is estimated"
              : "Tell us when you’re ready"
          }
          onClick={() => open("prep-transport")}
        />
        <ModuleRow
          icon="user"
          title="Family & support"
          subtitle={
            p.assistance && p.assistance !== "none"
              ? "Preference saved · Assistance not requested"
              : p.family === "yes"
                ? "Family preferences saved"
                : "Optional details for this journey"
          }
          onClick={() => open("prep-family")}
        />
      </div>
      <div className="prep-section-heading">
        <h3>Your time on board</h3>
      </div>
      <div className="module-group">
        <ModuleRow
          icon="coffee"
          title="Meal preference"
          subtitle={
            p.meal
              ? "Preference saved · No meal order placed"
              : "Leave this open or choose a preference"
          }
          onClick={() => open("prep-food")}
        />
        <ModuleRow
          icon="moon"
          title="Rest intention"
          subtitle={
            p.rest
              ? "Saved · You can change your mind on board"
              : "Choose what would feel right for you"
          }
          onClick={() => open("prep-rest")}
        />
        <ModuleRow
          icon="headphones"
          title="Your flight playlist"
          subtitle={
            state.saved.length
              ? `${state.saved.length} saved · Not transferred to a screen`
              : "Choose a film or a playlist"
          }
          onClick={() => open("prep-media")}
        />
      </div>
      <Footer>
        Optional preferences are separate from boarding requirements. No overall
        readiness score or operational completion is inferred.
      </Footer>
    </>
  );
}
export function PreparationScreen({ type }) {
  const screens = {
    prepare: Overview,
    "prep-intent": Intent,
    "prep-transport": Transport,
    "prep-family": Family,
    "prep-food": Food,
    "prep-rest": Rest,
    "prep-media": Media,
    "prep-onboard": Onboard,
    "prep-arrival": Arrival,
    "prep-feedback": Feedback,
    "prep-ready": Ready,
  };
  const Screen = screens[type];
  return Screen ? (
    <div className="preparation">
      <Screen />
    </div>
  ) : null;
}
