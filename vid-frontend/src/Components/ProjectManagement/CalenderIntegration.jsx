import React, { useState } from "react";

const CalendarIntegration = () => {
  const [events, setEvents] = useState([
    { id: 1, title: "Project Kickoff Meeting", date: "2023-07-15", type: "meeting" },
    { id: 2, title: "First Draft Due", date: "2023-07-30", type: "deadline" },
    { id: 3, title: "Client Review", date: "2023-08-05", type: "task" },
  ]);

  const [newEvent, setNewEvent] = useState({ title: "", date: "", type: "task" });

  const addEvent = () => {
    if (newEvent.title && newEvent.date) {
      setEvents([...events, { id: events.length + 1, ...newEvent }]);
      setNewEvent({ title: "", date: "", type: "task" });
    }
  };

  return (
    <div className="calendar-integration">
      <h2>Calendar</h2>
      <div className="event-list">
        {events.map((event) => (
          <div key={event.id} className={`event-item ${event.type}`}>
            <h3>{event.title}</h3>
            <p>Date: {event.date}</p>
            <p>Type: {event.type}</p>
          </div>
        ))}
      </div>
      <div className="add-event">
        <input
          type="text"
          placeholder="Event Title"
          value={newEvent.title}
          onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
        />
        <input
          type="date"
          value={newEvent.date}
          onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
        />
        <select
          value={newEvent.type}
          onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
        >
          <option value="deadline">Deadline</option>
          <option value="meeting">Meeting</option>
          <option value="task">Task</option>
        </select>
        <button onClick={addEvent}>Add Event</button>
      </div>
    </div>
  );
};

export default CalendarIntegration;
