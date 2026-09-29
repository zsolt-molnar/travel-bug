import type {
  TicketCardPayload,
  TimelineCardPayload,
} from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function TicketCard({ payload }: { payload: TicketCardPayload }) {
  return (
    <Card className="border-accent/40 bg-gradient-to-br from-card to-secondary/40">
      <CardHeader className="pb-2">
        <Badge className="w-fit bg-accent/20 text-accent-foreground">
          Museum pass
        </Badge>
        <CardTitle className="text-lg">{payload.title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">Venue · </span>
          {payload.venue}
        </p>
        <p>
          <span className="text-muted-foreground">When · </span>
          {payload.datetime}
        </p>
        {payload.code ? (
          <p className="font-mono text-base tracking-widest">{payload.code}</p>
        ) : null}
        <Button className="mt-2 w-full" variant="secondary">
          Show Ticket / Pass
        </Button>
      </CardContent>
    </Card>
  );
}

export function TimelineCard({ payload }: { payload: TimelineCardPayload }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {payload.tripDestination} · Timeline
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {payload.days.map((day) => (
          <div key={day.dayNumber}>
            <p className="text-sm font-semibold">
              Day {day.dayNumber}
              {day.theme ? ` · ${day.theme}` : ""}
            </p>
            <ul className="mt-2 space-y-2 border-l-2 border-primary/30 pl-3">
              {day.items.map((item) => (
                <li key={item.id} className="text-sm">
                  <span className="text-muted-foreground">{item.timeSlot}</span>{" "}
                  <Badge className="ml-1 capitalize">{item.itemType}</Badge>
                  <p className="font-medium">{item.title}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
