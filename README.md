# Platform for WebRTC Games

![Diagram](docs/Diagram.drawio.svg)


<div class="kanban">
<div data-category="Todo">

- right now it seems there's an issue with connecting on phone data connection

  - if this is the case for my device meaning we will require a turn server
  - then I think it might be a bad idea to pursue just webrtc controller

</div>
<div data-category="Doing">

world

</div>
<div data-category="Done">

there

</div>
</div>

<style>
    .kanban {
        display: grid;
        grid-auto-columns: 272px;
        grid-auto-flow: column;
        grid-gap: 4px;
        height: 100vh;
        overflow: auto;
    }
    .kanban > div {
        outline: solid 4px;
        padding: 0 6px;
    }
    .kanban > div::before {
        content: attr(data-category);
        display: block;
        text-align: center;
        text-decoration: underline;
    }
</style>