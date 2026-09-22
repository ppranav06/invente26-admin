export type TicketEvent = {
  position: number;
  event_id: string;
  name: string;
  dept_name: string;
  event_type: string;
  date: string | null;
  attendance: boolean;
  attendance_timestamp: string | null;
};

export type Ticket = {
  ticket_id: string;
  ticket_type: string;
  pass_type: string;
  status: string;
  amount_paid: string | number | null;
  payment_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  user: {
    user_id: string;
    email: string;
    name: string;
    phone: string | null;
    college_name: string | null;
    year_of_study: number | null;
  } | null;
};

export type HackathonTeam = {
  team_id: string;
  team_name: string;
  domain: string | null;
  track: string | null;
  members: Array<{
    member_id: string;
    name: string;
    email: string;
    phone: string | null;
    is_lead: boolean;
    year_of_study: number | null;
  }>;
};

export type TicketResponse = {
  ticket: Ticket;
  events: TicketEvent[];
  hackathon_teams: HackathonTeam[];
};

export type CatalogEvent = {
  event_id: string;
  name: string;
  dept_name: string;
  event_type: string;
  date: string | null;
  reg_count: number;
  attend_count: number;
};

export type AttendanceResponse = {
  already_attended: boolean;
  event: Partial<TicketEvent> & {
    event_id: string;
    attendance: boolean;
    attendance_timestamp: string | null;
  };
};

export type AssignmentResponse = {
  previous_event_id: string;
  event: Partial<TicketEvent> & {
    event_id: string;
    name: string;
    dept_name: string;
    event_type: string;
    date: string | null;
    attendance: boolean;
    attendance_timestamp: string | null;
  };
};

export type AddEventResponse = {
  event: TicketEvent;
};
