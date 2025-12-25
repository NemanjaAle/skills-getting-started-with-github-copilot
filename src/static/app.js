document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = type;
    messageDiv.classList.remove("hidden");

    setTimeout(() => {
      messageDiv.classList.add("hidden");
    }, 5000);
  }

  async function unregisterParticipant(activityName, email) {
    const response = await fetch(
      `/activities/${encodeURIComponent(activityName)}/signup?email=${encodeURIComponent(email)}`,
      { method: "DELETE" }
    );

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.detail || "Failed to unregister participant");
    }

    return result;
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // (Optional but prevents duplicates if fetchActivities is ever re-run)
      activitySelect.querySelectorAll('option:not([value=""])').forEach((o) => o.remove());

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        // Build DOM safely (avoid injecting raw HTML with user-provided values)
        const title = document.createElement("h4");
        title.textContent = name;

        const desc = document.createElement("p");
        desc.textContent = details.description;

        const schedule = document.createElement("p");
        schedule.innerHTML = `<strong>Schedule:</strong> ${details.schedule}`;

        const availability = document.createElement("p");
        availability.innerHTML = `<strong>Availability:</strong> ${spotsLeft} spots left`;

        const participantsWrap = document.createElement("div");
        participantsWrap.className = "participants";

        const participantsTitle = document.createElement("p");
        participantsTitle.className = "participants-title";
        participantsTitle.innerHTML = "<strong>Participants:</strong>";

        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";

        const participants = Array.isArray(details.participants) ? details.participants : [];
        if (participants.length === 0) {
          const empty = document.createElement("li");
          empty.className = "participants-empty";
          empty.textContent = "No participants yet.";
          participantsList.appendChild(empty);
        } else {
          participants.forEach((email) => {
            const li = document.createElement("li");

            const emailSpan = document.createElement("span");
            emailSpan.className = "participant-email";
            emailSpan.textContent = email;

            const removeBtn = document.createElement("button");
            removeBtn.type = "button";
            removeBtn.className = "participant-remove";
            removeBtn.setAttribute("aria-label", `Unregister ${email} from ${name}`);
            removeBtn.innerHTML = `
              <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                <path d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v9h-2v-9zm4 0h2v9h-2v-9zM7 10h2v9H7v-9zm-1-1h12l-1 12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L6 9z" />
              </svg>
            `;

            removeBtn.addEventListener("click", async () => {
              removeBtn.disabled = true;
              try {
                const result = await unregisterParticipant(name, email);
                showMessage(result.message || "Participant unregistered", "success");
                await fetchActivities();
              } catch (err) {
                showMessage(err.message || "Failed to unregister participant", "error");
                removeBtn.disabled = false;
              }
            });

            li.appendChild(emailSpan);
            li.appendChild(removeBtn);
            participantsList.appendChild(li);
          });
        }

        participantsWrap.appendChild(participantsTitle);
        participantsWrap.appendChild(participantsList);

        activityCard.appendChild(title);
        activityCard.appendChild(desc);
        activityCard.appendChild(schedule);
        activityCard.appendChild(availability);
        activityCard.appendChild(participantsWrap);

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        showMessage(result.message, "success");
        signupForm.reset();
        await fetchActivities();
      } else {
        showMessage(result.detail || "An error occurred", "error");
      }
    } catch (error) {
      showMessage("Failed to sign up. Please try again.", "error");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
