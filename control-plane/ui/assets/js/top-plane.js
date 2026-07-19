const viewport = document.querySelector(
  ".cc-dashboard-content-space"
);

if (!viewport) {
  throw new Error(
    "CloudCommand viewport was not found."
  );
}

const topPlane = document.createElement("header");
topPlane.className = "cc-top-plane";
topPlane.setAttribute(
  "aria-label",
  "Star map interaction plane"
);

const leftZone = document.createElement("div");
leftZone.className = "cc-top-plane-left";

const centerZone = document.createElement("div");
centerZone.className = "cc-top-plane-center";

const rightZone = document.createElement("div");
rightZone.className = "cc-top-plane-right";

const clock = document.createElement("time");
clock.className = "cc-top-plane-clock";

centerZone.append(clock);

topPlane.append(
  leftZone,
  centerZone,
  rightZone
);

viewport.append(topPlane);

function formatTimestamp(date) {
  const datePart = new Intl.DateTimeFormat(
    "en-CA",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(date);

  const timePart = new Intl.DateTimeFormat(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }
  ).format(date);

  const timezonePart = new Intl.DateTimeFormat(
    "en-US",
    {
      timeZoneName: "short",
    }
  )
    .formatToParts(date)
    .find(
      (part) => part.type === "timeZoneName"
    )?.value ?? "";

  clock.dateTime = date.toISOString();
  clock.textContent =
    `${datePart} · ${timePart} ${timezonePart}`;
}

function updateClock() {
  formatTimestamp(new Date());
}

updateClock();

const clockInterval = window.setInterval(
  updateClock,
  1000
);

window.addEventListener(
  "beforeunload",
  () => {
    window.clearInterval(clockInterval);
  },
  {
    once: true,
  }
);
