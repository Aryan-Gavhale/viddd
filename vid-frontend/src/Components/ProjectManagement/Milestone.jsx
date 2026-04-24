import React, { useState } from "react";

const MilestoneTracking = () => {
  const [milestones, setMilestones] = useState([
    { id: 1, title: "Initial Concept", dueDate: "2023-07-15", status: "Completed" },
    { id: 2, title: "First Draft", dueDate: "2023-07-30", status: "In Progress" },
    { id: 3, title: "Final Delivery", dueDate: "2023-08-15", status: "Not Started" },
  ]);

  const [newMilestone, setNewMilestone] = useState({ title: "", dueDate: "" });

  const addMilestone = () => {
    if (newMilestone.title && newMilestone.dueDate) {
      setMilestones([
        ...milestones,
        {
          id: milestones.length + 1,
          ...newMilestone,
          status: "Not Started",
        },
      ]);
      setNewMilestone({ title: "", dueDate: "" });
    }
  };

  const updateStatus = (id, status) => {
    setMilestones(milestones.map((m) => (m.id === id ? { ...m, status } : m)));
  };

  return (
    <div className="milestone-tracking">
      <h2>Milestones</h2>
      <div className="milestone-list">
        {milestones.map((milestone) => (
          <div key={milestone.id} className="milestone-item">
            <h3>{milestone.title}</h3>
            <p>Due: {milestone.dueDate}</p>
            <select
              value={milestone.status}
              onChange={(e) => updateStatus(milestone.id, e.target.value)}
            >
              <option value="Not Started">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        ))}
      </div>
      <div className="add-milestone">
        <input
          type="text"
          placeholder="Milestone Title"
          value={newMilestone.title}
          onChange={(e) => setNewMilestone({ ...newMilestone, title: e.target.value })}
        />
        <input
          type="date"
          value={newMilestone.dueDate}
          onChange={(e) => setNewMilestone({ ...newMilestone, dueDate: e.target.value })}
        />
        <button onClick={addMilestone}>Add Milestone</button>
      </div>
    </div>
  );
};

export default MilestoneTracking;
